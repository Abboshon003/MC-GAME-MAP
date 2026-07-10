import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { PixelGlyph } from '@/icons/PixelIcon';
import type { LatLng, Route } from '@/nav/types';
import type { Daylight } from './daylight';
import {
  cellHash,
  makeProjector,
  MapCamera,
  northScreenAngle,
  projectBlockCorner,
  visibleCells,
  Viewport,
} from './projection';
import { GRASS, type TerrainType, type VoxelGrid } from './voxelize';
import { GRASS_PATTERN, MapTextures, PATTERN } from './textures';
import { IsoScene, RoadMarkings, StreetLabels } from './layers';
import type { WorldData } from './worldData';

export interface ParchmentMapProps {
  /** Camera is computed by the screen (follow player / fit route). */
  camera: MapCamera;
  route: Route | null;
  player?: LatLng | null;
  /** Player heading, degrees clockwise from north. */
  heading?: number;
  destination?: LatLng | null;
  /** Voxelized ground grid; null → procedural fallback terrain. */
  world?: VoxelGrid | null;
  /** Raw vector features for buildings / roads / labels. */
  features?: WorldData | null;
  /** Day/night color grade drawn over the map. */
  daylight?: Daylight | null;
  /** full = isometric world with volume; lite = flat (while navigating). */
  detail?: 'full' | 'lite';
  width: number;
  height: number;
}

/**
 * The voxel adventure map. Browsing renders the real world as a tilted
 * isometric block world — volumetric buildings with pitched roofs, voxel
 * trees, directional shadows — built from live OSM data. Navigation drops
 * to a flat top-down view for readability. Never a Google-Maps pane.
 */
export function ParchmentMap({
  camera,
  route,
  player,
  heading = 0,
  destination,
  world,
  features,
  daylight,
  detail = 'full',
  width,
  height,
}: ParchmentMapProps) {
  const view: Viewport = { width, height };
  const iso = detail === 'full';
  const proj = useMemo(
    () => makeProjector(camera, view, iso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera.center.lat, camera.center.lon, camera.zoom, width, height, iso],
  );

  const routePoints = useMemo(() => {
    if (!route) return '';
    return route.coords
      .map((c) => {
        const p = proj(c);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');
  }, [route, proj]);

  const playerPx = player ? proj(player) : null;
  const destPx = destination ? proj(destination) : null;
  const markerAngle = heading + northScreenAngle(iso);

  return (
    <View style={{ width, height, backgroundColor: GRASS, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        <MapTextures />

        {/* ——— grass base ——— */}
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${GRASS_PATTERN})`} />

        {/* ——— ground terrain blocks (textured), or procedural fallback ——— */}
        {world ? (
          <VoxelBlocks world={world} camera={camera} view={view} iso={iso} />
        ) : (
          <TerrainDecor camera={camera} view={view} />
        )}

        {/* ——— road lane markings ——— */}
        {features && <RoadMarkings world={features} proj={proj} view={view} />}

        {/* ——— the route: dark brown outline under a gold pixel trail ——— */}
        {route && (
          <G>
            <Polyline points={routePoints} fill="none" stroke={colors.routeOutline} strokeWidth={12} strokeLinecap="butt" strokeLinejoin="miter" />
            <Polyline points={routePoints} fill="none" stroke={colors.routeGold} strokeWidth={6} strokeLinecap="butt" strokeLinejoin="miter" strokeDasharray="10 4" />
          </G>
        )}

        {/* ——— volumetric scene: buildings + trees, depth-sorted ——— */}
        <IsoScene
          world={features ?? null}
          grid={world ?? null}
          proj={proj}
          camera={camera}
          view={view}
          iso={iso}
          detail={detail}
        />

        {/* ——— destination: small red banner ——— */}
        {destPx && (
          <PixelGlyph
            x={destPx.x - 14}
            y={destPx.y - 26}
            size={28}
            palette={{ p: colors.dirtDark, r: colors.dangerRed, k: colors.bannerRed, g: colors.routeGold }}
            grid={[
              '.pp.........',
              '.pprrrrrrr..',
              '.pprkkkkkr..',
              '.pprkgggkr..',
              '.pprkkkkkr..',
              '.pprrrrrrr..',
              '.pprrr.rrr..',
              '.pprr...rr..',
              '.pp.........',
              '.pp.........',
              '.pp.........',
              '.pp.........',
            ]}
          />
        )}

        {/* ——— player: voxel triangle, rotates with heading ——— */}
        {playerPx && (
          <G transform={`translate(${playerPx.x}, ${playerPx.y}) rotate(${markerAngle})`}>
            <Polygon points="-11,15 0,-15 11,15 0,8" fill="#000000" opacity={0.3} transform="translate(2.5,2.5)" />
            <Polygon points="-13,17 0,-18 13,17 0,9" fill={colors.routeOutline} />
            <Polygon points="-9,13 0,-13 9,13 0,6" fill={colors.routeGold} />
          </G>
        )}

        {/* ——— day/night grade over the whole map ——— */}
        {daylight && daylight.opacity > 0 && (
          <Rect x={0} y={0} width={width} height={height} fill={daylight.tint} opacity={daylight.opacity} />
        )}

        {/* ——— street name labels (above the tint so they stay legible) ——— */}
        {features && detail === 'full' && <StreetLabels world={features} proj={proj} view={view} />}

        {/* ——— compass rose, top-right ——— */}
        <CompassRose x={width - 46} y={14} />
      </Svg>
    </View>
  );
}

/** Draw the stored non-grass blocks that fall inside the viewport. */
function VoxelBlocks({
  world, camera, view, iso,
}: { world: VoxelGrid; camera: MapCamera; view: Viewport; iso: boolean }) {
  const shapes = useMemo(() => {
    const out: React.ReactElement[] = [];
    world.blocks.forEach((type, k) => {
      const comma = k.indexOf(',');
      const bx = +k.slice(0, comma);
      const by = +k.slice(comma + 1);
      // project all 4 corners so blocks become diamonds in iso view
      const c0 = projectBlockCorner(bx, by, camera, view, iso);
      const c1 = projectBlockCorner(bx + 1, by, camera, view, iso);
      const c2 = projectBlockCorner(bx + 1, by + 1, camera, view, iso);
      const c3 = projectBlockCorner(bx, by + 1, camera, view, iso);
      const minX = Math.min(c0.x, c1.x, c2.x, c3.x);
      const maxX = Math.max(c0.x, c1.x, c2.x, c3.x);
      const minY = Math.min(c0.y, c1.y, c2.y, c3.y);
      const maxY = Math.max(c0.y, c1.y, c2.y, c3.y);
      if (maxX < 0 || minX > view.width || maxY < 0 || minY > view.height) return;
      // expand slightly to hide seams
      const ex = 0.6;
      const cx = (c0.x + c2.x) / 2;
      const cy = (c0.y + c2.y) / 2;
      const pts = [c0, c1, c2, c3]
        .map((c) => `${(c.x + Math.sign(c.x - cx) * ex).toFixed(1)},${(c.y + Math.sign(c.y - cy) * ex).toFixed(1)}`)
        .join(' ');
      out.push(<Polygon key={k} points={pts} fill={`url(#${PATTERN[type as TerrainType]})`} />);
    });
    return out;
  }, [world, camera.center.lat, camera.center.lon, camera.zoom, view.width, view.height, iso]);

  return <G>{shapes}</G>;
}

/** Procedural fallback terrain: stable blocky patches while world data loads. */
function TerrainDecor({ camera, view }: { camera: MapCamera; view: Viewport }) {
  const cellZoom = Math.max(2, Math.round(camera.zoom - 1.5));
  const cells = visibleCells(camera, view, cellZoom);
  const blocks: React.ReactElement[] = [];
  cells.forEach((cell) => {
    const kind = cellHash(cell.cx, cell.cy, 7);
    let fill: string | null = null;
    if (kind < 0.18) fill = colors.grassDark;
    else if (kind < 0.26) fill = colors.water;
    else if (kind < 0.34) fill = colors.forest;
    if (!fill) return;
    const n = 2 + Math.floor(cellHash(cell.cx, cell.cy, 11) * 4);
    for (let i = 0; i < n; i++) {
      const rx = cellHash(cell.cx, cell.cy, 13 + i);
      const ry = cellHash(cell.cx, cell.cy, 29 + i);
      const rs = 0.18 + cellHash(cell.cx, cell.cy, 43 + i) * 0.22;
      blocks.push(
        <Rect key={`${cell.cx}-${cell.cy}-${i}`} x={cell.x + rx * cell.size * 0.8} y={cell.y + ry * cell.size * 0.8} width={cell.size * rs} height={cell.size * rs} fill={fill} opacity={0.55} />,
      );
    }
  });
  return <G>{blocks}</G>;
}

/** Small pixel compass rose. */
function CompassRose({ x, y }: { x: number; y: number }) {
  return (
    <PixelGlyph
      x={x}
      y={y}
      size={32}
      palette={{ o: colors.dirtDark, f: colors.parchmentDeep, n: colors.dangerRed, s: '#F4EBC2' }}
      grid={[
        '....oooo....',
        '..ooffffoo..',
        '.offffffffo.',
        '.offffnfffo.',
        'offfffnffffo',
        'offffnnnfffo',
        'offffnnnfffo',
        'offffsnffffo',
        '.offsfffffo.',
        '.offffffffo.',
        '..ooffffoo..',
        '....oooo....',
      ]}
    />
  );
}
