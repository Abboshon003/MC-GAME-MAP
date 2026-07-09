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

/** Refetch once the player moves more than this from the last fetch center. */
const REFETCH_MARGIN_M = 400;
const FETCH_RADIUS_M = 700;

/**
 * Manages live world data around the player: fetches on first fix, refetches
 * when the player leaves the loaded area, caches the last good grid, and
 * degrades gracefully on failure. Keeps the previous grid visible while a
 * new area loads so the map never blanks out.
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

  useEffect(() => {
    if (!enabled || !player) return;

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
        setTiles({ grid: voxelize(world), world, pois: world.pois, loading: false, failed: false });
      } catch {
        if (ctrl.signal.aborted) return;
        // Keep any previous grid; just flag failure so the map can fall back.
        setTiles((t) => ({ ...t, loading: false, failed: t.grid === null }));
      }
    })();

    return () => ctrl.abort();
    // Re-run whenever the player location object changes; the margin check
    // above throttles actual network fetches.
  }, [player?.lat, player?.lon, enabled]);

  return tiles;
}
