import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { PixelGlyph } from '@/icons/PixelIcon';
import type { LatLng, Route } from '@/nav/types';
import { cellHash, fitBounds, MapCamera, project, visibleCells, Viewport } from './projection';

export interface ParchmentMapProps {
  route: Route | null;
  /** Player position (already snapped to route while navigating) */
  player?: LatLng | null;
  /** Player heading, degrees clockwise from north */
  heading?: number;
  destination?: LatLng | null;
  /** follow = camera locks to player; overview = fit whole route */
  mode: 'follow' | 'overview';
  width: number;
  height: number;
}

/**
 * The parchment adventure map. Not a Google-Maps look: the world is drawn
 * as an aged paper item with blocky terrain decoration, a gold pixel route
 * with a dark brown outline, an original voxel player triangle and a red
 * banner at the destination.
 */
export function ParchmentMap({
  route,
  player,
  heading = 0,
  destination,
  mode,
  width,
  height,
}: ParchmentMapProps) {
  const view: Viewport = { width, height };

  const camera: MapCamera = useMemo(() => {
    if (mode === 'overview' && route) {
      return fitBounds(route.coords, view, 56);
    }
    if (player) return { center: player, zoom: 16 };
    if (route) return fitBounds(route.coords, view, 56);
    return { center: { lat: 0, lon: 0 }, zoom: 3 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, route, player?.lat, player?.lon, width, height]);

  const routePoints = useMemo(() => {
    if (!route) return '';
    return route.coords
      .map((c) => {
        const p = project(c, camera, view);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, camera, width, height]);

  const playerPx = player ? project(player, camera, view) : null;
  const destPx = destination ? project(destination, camera, view) : null;

  return (
    <View style={{ width, height, backgroundColor: colors.parchment, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        {/* ——— terrain decoration: stable blocky patches per world cell ——— */}
        <TerrainDecor camera={camera} view={view} />

        {/* ——— worn parchment edge ——— */}
        <ParchmentEdge width={width} height={height} />

        {/* ——— the route: dark brown outline under a gold pixel trail ——— */}
        {route && (
          <G>
            <Polyline
              points={routePoints}
              fill="none"
              stroke={colors.routeOutline}
              strokeWidth={12}
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            <Polyline
              points={routePoints}
              fill="none"
              stroke={colors.routeGold}
              strokeWidth={6}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeDasharray="10 4"
            />
          </G>
        )}

        {/* ——— destination: small red banner ——— */}
        {destPx && (
          <PixelGlyph
            x={destPx.x - 14}
            y={destPx.y - 26}
            size={28}
            palette={{
              p: colors.dirtDark,
              r: colors.dangerRed,
              k: colors.bannerRed,
              g: colors.routeGold,
            }}
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
          <G
            transform={`translate(${playerPx.x}, ${playerPx.y}) rotate(${heading})`}
          >
            {/* hard shadow block */}
            <Polygon points="-11,15 0,-15 11,15 0,8" fill="#000000" opacity={0.3} transform="translate(2.5,2.5)" />
            {/* brown outline */}
            <Polygon points="-13,17 0,-18 13,17 0,9" fill={colors.routeOutline} />
            {/* gold body */}
            <Polygon points="-9,13 0,-13 9,13 0,6" fill={colors.routeGold} />
          </G>
        )}

        {/* ——— compass rose, top-right ——— */}
        <CompassRose x={width - 46} y={14} />
      </Svg>
    </View>
  );
}

/** Blocky terrain patches: deterministic per world cell so panning is stable. */
function TerrainDecor({ camera, view }: { camera: MapCamera; view: Viewport }) {
  // Cells roughly 60-120px on screen
  const cellZoom = Math.max(2, Math.round(camera.zoom - 1.5));
  const cells = visibleCells(camera, view, cellZoom);
  const blocks: React.ReactElement[] = [];

  cells.forEach((cell) => {
    const kind = cellHash(cell.cx, cell.cy, 7);
    // Most cells stay plain parchment; some get a muted terrain patch
    let fill: string | null = null;
    if (kind < 0.16) fill = '#CFE0B4'; // grass tint on parchment
    else if (kind < 0.24) fill = '#C4D4E0'; // water tint
    else if (kind < 0.34) fill = '#DECf9E'; // sand tint
    else if (kind < 0.4) fill = '#C9BC8C'; // worn patch
    if (!fill) return;

    // Draw a cluster of small squares inside the cell (blocky patch)
    const n = 3 + Math.floor(cellHash(cell.cx, cell.cy, 11) * 5);
    for (let i = 0; i < n; i++) {
      const rx = cellHash(cell.cx, cell.cy, 13 + i);
      const ry = cellHash(cell.cx, cell.cy, 29 + i);
      const rs = 0.12 + cellHash(cell.cx, cell.cy, 43 + i) * 0.2;
      blocks.push(
        <Rect
          key={`${cell.cx}-${cell.cy}-${i}`}
          x={cell.x + rx * cell.size * 0.8}
          y={cell.y + ry * cell.size * 0.8}
          width={cell.size * rs}
          height={cell.size * rs}
          fill={fill}
          opacity={0.8}
        />,
      );
    }
  });

  return <G>{blocks}</G>;
}

/** Aged paper edge: layered pixel rings + worn corner notches. */
function ParchmentEdge({ width, height }: { width: number; height: number }) {
  const notch = 10;
  return (
    <G>
      <Rect x={0} y={0} width={width} height={height} fill="none" stroke={colors.parchmentShadow} strokeWidth={10} />
      <Rect x={5} y={5} width={width - 10} height={height - 10} fill="none" stroke={colors.parchmentDeep} strokeWidth={4} />
      {/* worn corners */}
      {[
        [0, 0],
        [width - notch, 0],
        [0, height - notch],
        [width - notch, height - notch],
      ].map(([x, y], i) => (
        <Rect key={i} x={x} y={y} width={notch} height={notch} fill={colors.parchmentShadow} />
      ))}
    </G>
  );
}

/** Small pixel compass rose. */
function CompassRose({ x, y }: { x: number; y: number }) {
  return (
    <PixelGlyph
      x={x}
      y={y}
      size={32}
      palette={{
        o: colors.parchmentInk,
        f: colors.parchmentDeep,
        n: colors.dangerRed,
        s: '#F4EBC2',
      }}
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
