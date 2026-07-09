import React from 'react';
import { G, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fontFamilies } from '@/theme';
import type { LatLng } from '@/nav/types';
import { blockScreenSize, cellHash, project, projectBlock, type MapCamera, type Viewport } from './projection';
import type { VoxelGrid } from './voxelize';
import type { WorldData } from './worldData';
import { PATTERN, roofPattern, wallColor } from './textures';

type Pt = { x: number; y: number };

const projectRing = (ring: LatLng[], camera: MapCamera, view: Viewport): Pt[] =>
  ring.map((p) => project(p, camera, view));
const ptsStr = (pts: Pt[]): string => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const shift = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));

function bounds(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, cx = 0, cy = 0;
  for (const p of pts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    cx += p.x; cy += p.y;
  }
  return { minX, minY, maxX, maxY, cx: cx / pts.length, cy: cy / pts.length };
}

const hashOf = (p: LatLng) => Math.abs(Math.round(p.lat * 9173 + p.lon * 6291)) >>> 0;

/* ————————————————————————— 3D buildings ————————————————————————— */

export function Buildings3D({
  world, camera, view, detail,
}: { world: WorldData; camera: MapCamera; view: Viewport; detail: 'full' | 'lite' }) {
  const buildings = world.polygons.filter((p) => p.kind === 'building' && p.ring.length >= 3);

  // Nearest-to-center first, capped for performance.
  const drawn = buildings
    .map((b) => {
      const pts = projectRing(dedupeRing(b.ring), camera, view);
      const bb = bounds(pts);
      return { b, pts, bb, d: Math.hypot(bb.cx - view.width / 2, bb.cy - view.height / 2) };
    })
    .filter(({ bb }) => bb.maxX > -30 && bb.minX < view.width + 30 && bb.maxY > -30 && bb.minY < view.height + 30)
    .sort((a, b) => a.d - b.d)
    .slice(0, detail === 'full' ? 90 : 50);

  const out: React.ReactElement[] = [];
  for (const { b, pts } of drawn) {
    const h = hashOf(b.ring[0]);
    const roof = roofPattern(h);
    const key = `b${h}`;
    const lift = detail === 'full' ? 4 + (h % 3) * 2 : 0;
    const roofPts = lift ? shift(pts, 0, -lift) : pts;

    // drop shadow (sun from top-left)
    out.push(
      <Polygon key={`${key}s`} points={ptsStr(shift(pts, 3 + lift * 0.4, 3 + lift * 0.4))} fill="#000000" opacity={0.22} />,
    );
    // low walls
    if (lift) {
      const wc = wallColor(roof);
      for (let i = 0; i < pts.length - 1; i++) {
        out.push(
          <Polygon key={`${key}w${i}`} points={ptsStr([pts[i], pts[i + 1], roofPts[i + 1], roofPts[i]])} fill={wc} stroke="#000000" strokeOpacity={0.2} strokeWidth={0.5} />,
        );
      }
    }

    if (pts.length === 5 || pts.length === 4) {
      // rectangular house → gable roof seen from above: two shaded halves + ridge
      out.push(<GableRoof key={`${key}g`} pts={roofPts} roof={roof} hash={h} />);
    } else {
      // complex footprint → flat textured roof with parapet + vents
      out.push(
        <Polygon key={`${key}r`} points={ptsStr(roofPts)} fill={`url(#${roof})`} stroke="#1E1E1E" strokeOpacity={0.5} strokeWidth={1.5} />,
      );
      const bb = bounds(roofPts);
      if (detail === 'full' && (bb.maxX - bb.minX) > 26) {
        out.push(
          <Rect key={`${key}v1`} x={bb.cx - 5} y={bb.cy - 3} width={5} height={5} fill="#6E6E6E" stroke="#4A4A4A" strokeWidth={1} />,
          <Rect key={`${key}v2`} x={bb.cx + 3} y={bb.cy + 1} width={4} height={4} fill="#7B7B7B" stroke="#4A4A4A" strokeWidth={1} />,
        );
      }
    }
  }
  return <G>{out}</G>;
}

/** Drop a duplicated closing point so a rectangle reads as 4 corners + close. */
function dedupeRing(ring: LatLng[]): LatLng[] {
  const a = ring[0];
  const z = ring[ring.length - 1];
  if (ring.length > 3 && Math.abs(a.lat - z.lat) < 1e-9 && Math.abs(a.lon - z.lon) < 1e-9) {
    return ring;
  }
  return [...ring, a];
}

/**
 * Aerial-view gable roof for a (roughly) rectangular footprint: a ridge line
 * along the long axis with a sunlit half and a shaded half — the classic
 * Minecraft-house-from-above read.
 */
function GableRoof({ pts, roof, hash }: { pts: Pt[]; roof: string; hash: number }) {
  const [c0, c1, c2, c3] = pts;
  const e01 = Math.hypot(c1.x - c0.x, c1.y - c0.y);
  const e12 = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  // ridge runs parallel to the longer edge pair
  const longFirst = e01 >= e12;
  const r0: Pt = longFirst
    ? { x: (c0.x + c3.x) / 2, y: (c0.y + c3.y) / 2 }
    : { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
  const r1: Pt = longFirst
    ? { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 }
    : { x: (c3.x + c2.x) / 2, y: (c3.y + c2.y) / 2 };
  const halfA: Pt[] = longFirst ? [c0, c1, r1, r0] : [c0, r0, r1, c3];
  const halfB: Pt[] = longFirst ? [r0, r1, c2, c3] : [r0, c1, c2, r1];

  // sun from top-left: the half whose centroid sits higher-left is lit
  const litA = bounds(halfA).cy + bounds(halfA).cx <= bounds(halfB).cy + bounds(halfB).cx;
  const chimney = hash % 3 === 0;
  const ct = 0.3 + (hash % 5) * 0.1;
  const cx = r0.x + (r1.x - r0.x) * ct;
  const cy = r0.y + (r1.y - r0.y) * ct;

  return (
    <G>
      <Polygon points={ptsStr(halfA)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(halfA)} fill={litA ? '#FFFFFF' : '#000000'} opacity={litA ? 0.14 : 0.2} />
      <Polygon points={ptsStr(halfB)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(halfB)} fill={litA ? '#000000' : '#FFFFFF'} opacity={litA ? 0.2 : 0.14} />
      {/* eaves + ridge */}
      <Polygon points={ptsStr(pts)} fill="none" stroke="#1E1E1E" strokeOpacity={0.55} strokeWidth={1.5} />
      <Polyline points={ptsStr([r0, r1])} fill="none" stroke="#2A1D10" strokeOpacity={0.7} strokeWidth={2} />
      {chimney && (
        <G>
          <Rect x={cx - 3} y={cy - 3} width={6} height={6} fill="#6E6E6E" stroke="#3A3A3A" strokeWidth={1} />
          <Rect x={cx - 1.5} y={cy - 1.5} width={3} height={3} fill="#2B2B2B" />
        </G>
      )}
    </G>
  );
}

/* ————————————————————————— trees ————————————————————————— */

export function Trees({
  grid, camera, view,
}: { grid: VoxelGrid; camera: MapCamera; view: Viewport }) {
  const size = blockScreenSize(camera);
  const out: React.ReactElement[] = [];
  let count = 0;
  for (const [k, type] of grid.blocks) {
    if (count >= 90) break;
    if (type !== 'park' && type !== 'forest') continue;
    const comma = k.indexOf(',');
    const bx = +k.slice(0, comma);
    const by = +k.slice(comma + 1);
    // ~40% of green blocks get a tree, deterministically
    if (cellHash(bx, by, 5) > (type === 'forest' ? 0.55 : 0.35)) continue;
    const p = projectBlock(bx, by, camera, view);
    if (p.x < -20 || p.x > view.width + 20 || p.y < -20 || p.y > view.height + 20) continue;
    const jx = cellHash(bx, by, 9) * size * 0.4;
    const jy = cellHash(bx, by, 17) * size * 0.4;
    out.push(<TreeSprite key={`t${k}`} x={p.x + jx} y={p.y + jy} r={Math.max(5, size * 0.42)} />);
    count++;
  }
  return <G>{out}</G>;
}

function TreeSprite({ x, y, r }: { x: number; y: number; r: number }) {
  const t = r * 0.5;
  return (
    <G>
      {/* shadow */}
      <Polygon points={ptsStr([{ x: x - r, y: y + r * 0.9 }, { x: x + r, y: y + r * 0.9 }, { x: x + r * 0.6, y: y + r * 1.3 }, { x: x - r * 0.6, y: y + r * 1.3 }])} fill="#000000" opacity={0.15} />
      {/* trunk */}
      <Rect x={x - t * 0.25} y={y} width={t * 0.5} height={r} fill="#5C3E22" />
      {/* leaf cluster (blocky plus) */}
      <Rect x={x - r} y={y - r * 0.4} width={r * 2} height={r} fill="#2E7D32" />
      <Rect x={x - r * 0.55} y={y - r * 1.1} width={r * 1.1} height={r * 1.4} fill="#358A38" />
      <Rect x={x - r * 0.8} y={y - r * 0.2} width={r * 0.35} height={r * 0.5} fill="#256B2A" />
      <Rect x={x + r * 0.45} y={y - r * 0.2} width={r * 0.35} height={r * 0.5} fill="#256B2A" />
      <Rect x={x - r * 0.2} y={y - r} width={r * 0.4} height={r * 0.4} fill="#43A047" />
    </G>
  );
}

/* ————————————————————————— road markings ————————————————————————— */

export function RoadMarkings({
  world, camera, view,
}: { world: WorldData; camera: MapCamera; view: Viewport }) {
  const out: React.ReactElement[] = [];
  let n = 0;
  for (const road of world.roads) {
    if (road.klass !== 'major') continue;
    if (n >= 40) break;
    const pts = projectRing(road.pts, camera, view);
    const bb = bounds(pts);
    if (bb.maxX < 0 || bb.minX > view.width || bb.maxY < 0 || bb.minY > view.height) continue;
    out.push(
      <Polyline key={`rm${n}`} points={ptsStr(pts)} fill="none" stroke="#E9C93B" strokeWidth={1.5} strokeDasharray="6 7" strokeOpacity={0.85} />,
    );
    n++;
  }
  return <G>{out}</G>;
}

/* ————————————————————————— street labels ————————————————————————— */

export function StreetLabels({
  world, camera, view,
}: { world: WorldData; camera: MapCamera; view: Viewport }) {
  // one label per unique name, using the longest road with that name
  const byName = new Map<string, { pts: Pt[]; len: number }>();
  for (const road of world.roads) {
    if (!road.name) continue;
    const pts = projectRing(road.pts, camera, view);
    const bb = bounds(pts);
    if (bb.maxX < 0 || bb.minX > view.width || bb.maxY < 0 || bb.minY > view.height) continue;
    const len = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
    const cur = byName.get(road.name);
    if (!cur || len > cur.len) byName.set(road.name, { pts, len });
  }

  const labels = [...byName.entries()]
    .filter(([, v]) => v.len > 70)
    .sort((a, b) => b[1].len - a[1].len)
    .slice(0, 10);

  const out: React.ReactElement[] = [];
  for (const [name, { pts }] of labels) {
    const mid = pts[Math.floor(pts.length / 2)];
    const a = pts[0];
    const b = pts[pts.length - 1];
    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const common = {
      fontFamily: fontFamilies.body,
      fontSize: 13,
      textAnchor: 'middle' as const,
    };
    out.push(
      <G key={`sl${name}`} transform={`rotate(${angle.toFixed(1)}, ${mid.x.toFixed(1)}, ${mid.y.toFixed(1)})`}>
        {/* dark shadow behind for legibility */}
        <SvgText x={mid.x + 1} y={mid.y + 1} fill="#1E1E1E" {...common}>
          {name}
        </SvgText>
        <SvgText x={mid.x} y={mid.y} fill={colors.textLight} {...common}>
          {name}
        </SvgText>
      </G>,
    );
  }
  return <G>{out}</G>;
}
