import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { PixelGlyph } from '@/icons/PixelIcon';
import type { LatLng, Route } from '@/nav/types';
import type { Daylight } from './daylight';
import {
  blockScreenSize,
  cellHash,
  MapCamera,
  project,
  projectBlock,
  visibleCells,
  Viewport,
} from './projection';
import { GRASS, TERRAIN_COLORS, type TerrainType, type VoxelGrid } from './voxelize';

export interface ParchmentMapProps {
  /** Camera is computed by the screen (follow player / fit route). */
  camera: MapCamera;
  route: Route | null;
  player?: LatLng | null;
  /** Player heading, degrees clockwise from north. */
  heading?: number;
  destination?: LatLng | null;
  /** Voxelized world features; null → procedural fallback terrain. */
  world?: VoxelGrid | null;
  /** Day/night color grade drawn over the map. */
  daylight?: Daylight | null;
  width: number;
  height: number;
}

/**
 * The voxel adventure map. The real world (roads, water, parks, buildings)
 * is drawn as a chunky top-down block world on a grass base — never a
 * Google-Maps pane — with a gold pixel route, an original voxel player
 * triangle, a red destination banner, and a day/night tint.
 */
export function ParchmentMap({
  camera,
  route,
  player,
  heading = 0,
  destination,
  world,
  daylight,
  width,
  height,
}: ParchmentMapProps) {
  const view: Viewport = { width, height };

  const routePoints = useMemo(() => {
    if (!route) return '';
    return route.coords
      .map((c) => {
        const p = project(c, camera, view);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, camera.center.lat, camera.center.lon, camera.zoom, width, height]);

  const playerPx = player ? project(player, camera, view) : null;
  const destPx = destination ? project(destination, camera, view) : null;

  return (
    <View style={{ width, height, backgroundColor: GRASS, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        {/* ——— voxel world blocks (or procedural fallback) ——— */}
        {world ? (
          <VoxelBlocks world={world} camera={camera} view={view} />
        ) : (
          <TerrainDecor camera={camera} view={view} />
        )}

        {/* ——— the route: dark brown outline under a gold pixel trail ——— */}
        {route && (
          <G>
            <Polyline points={routePoints} fill="none" stroke={colors.routeOutline} strokeWidth={12} strokeLinecap="butt" strokeLinejoin="miter" />
            <Polyline points={routePoints} fill="none" stroke={colors.routeGold} strokeWidth={6} strokeLinecap="butt" strokeLinejoin="miter" strokeDasharray="10 4" />
          </G>
        )}

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
          <G transform={`translate(${playerPx.x}, ${playerPx.y}) rotate(${heading})`}>
            <Polygon points="-11,15 0,-15 11,15 0,8" fill="#000000" opacity={0.3} transform="translate(2.5,2.5)" />
            <Polygon points="-13,17 0,-18 13,17 0,9" fill={colors.routeOutline} />
            <Polygon points="-9,13 0,-13 9,13 0,6" fill={colors.routeGold} />
          </G>
        )}

        {/* ——— day/night grade over the whole map ——— */}
        {daylight && daylight.opacity > 0 && (
          <Rect x={0} y={0} width={width} height={height} fill={daylight.tint} opacity={daylight.opacity} />
        )}

        {/* ——— compass rose, top-right ——— */}
        <CompassRose x={width - 46} y={14} />
      </Svg>
    </View>
  );
}

/** Draw the stored non-grass blocks that fall inside the viewport. */
function VoxelBlocks({ world, camera, view }: { world: VoxelGrid; camera: MapCamera; view: Viewport }) {
  const rects = useMemo(() => {
    const size = blockScreenSize(camera);
    const draw = size + 1; // overlap 1px to hide seams
    const out: React.ReactElement[] = [];
    world.blocks.forEach((type, k) => {
      const comma = k.indexOf(',');
      const bx = +k.slice(0, comma);
      const by = +k.slice(comma + 1);
      const p = projectBlock(bx, by, camera, view);
      if (p.x <= -draw || p.x >= view.width || p.y <= -draw || p.y >= view.height) return;
      out.push(
        <Rect key={k} x={p.x} y={p.y} width={draw} height={draw} fill={TERRAIN_COLORS[type as TerrainType].face} />,
      );
    });
    return out;
  }, [world, camera.center.lat, camera.center.lon, camera.zoom, view.width, view.height]);

  return <G>{rects}</G>;
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
