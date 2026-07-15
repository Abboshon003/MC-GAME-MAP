import { useEffect, useRef, useState } from 'react';
import { haversineMeters } from '@/nav/geo';
import type { LatLng } from '@/nav/types';
import type { Poi } from '@/nav/poi';
import { fetchWorld, type WorldData } from './worldData';
import { voxelize, type VoxelGrid } from './voxelize';

export interface WorldTiles {
  grid: VoxelGrid | null;
  /** Raw vector features (buildings, roads with names) for the detailed layers. */
  world: WorldData | null;
  pois: Poi[];
  loading: boolean;
  /** True if the last fetch failed (renderer falls back to procedural terrain). */
  failed: boolean;
}

interface CachedTile {
  center: LatLng;
  grid: VoxelGrid;
  world: WorldData;
  pois: Poi[];
}

/**
 * Smaller radius than before — a dense-city 700 m pull was the main reason
 * first load took minutes. ~450 m still covers more than the screen at browse
 * zoom and returns far faster from Overpass.
 */
const FETCH_RADIUS_M = 450;
/** Refetch once the camera leaves this ring around the last fetch center. */
const REFETCH_MARGIN_M = 250;
/** Reuse a cached tile if the camera is within this of its center. */
const CACHE_REUSE_M = 220;
const MAX_CACHE = 8;

/**
 * Manages live world data around wherever the camera looks. Fetches on first
 * fix, refetches only when leaving the loaded ring, and keeps a small LRU
 * cache of recently-loaded areas so panning back to a place is instant (no
 * network). Keeps the previous world visible while a new area loads so the
 * map never blanks out.
 */
export function useWorldTiles(player: LatLng | null, enabled = true): WorldTiles {
  const [tiles, setTiles] = useState<WorldTiles>({
    grid: null,
    world: null,
    pois: [],
    loading: false,
    failed: false,
  });
  const lastCenter = useRef<LatLng | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const cache = useRef<CachedTile[]>([]);

  useEffect(() => {
    if (!enabled || !player) return;

    // 1) Serve from cache if a recently-loaded area still covers this spot.
    const hit = cache.current.find((t) => haversineMeters(t.center, player) < CACHE_REUSE_M);
    if (hit && hit.center !== lastCenter.current) {
      lastCenter.current = hit.center;
      // Refresh LRU order.
      cache.current = [hit, ...cache.current.filter((t) => t !== hit)];
      setTiles({ grid: hit.grid, world: hit.world, pois: hit.pois, loading: false, failed: false });
      return;
    }

    // 2) Otherwise fetch only when we've left the loaded ring.
    const moved =
      !lastCenter.current || haversineMeters(lastCenter.current, player) > REFETCH_MARGIN_M;
    if (!moved) return;

    lastCenter.current = player;
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;

    setTiles((t) => ({ ...t, loading: true }));
    (async () => {
      try {
        const world = await fetchWorld(player, FETCH_RADIUS_M, ctrl.signal);
        if (ctrl.signal.aborted) return;
        const grid = voxelize(world);
        cache.current = [{ center: world.center, grid, world, pois: world.pois }, ...cache.current].slice(
          0,
          MAX_CACHE,
        );
        setTiles({ grid, world, pois: world.pois, loading: false, failed: false });
      } catch {
        if (ctrl.signal.aborted) return;
        // Keep any previous world; only flag failure if we have nothing at all.
        setTiles((t) => ({ ...t, loading: false, failed: t.grid === null }));
      }
    })();

    return () => ctrl.abort();
    // Re-run whenever the watched location changes; the cache + margin checks
    // above throttle actual network fetches.
  }, [player?.lat, player?.lon, enabled]);

  return tiles;
}
