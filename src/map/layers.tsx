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
      const pts = projectRing(b.ring, camera, view);
      const bb = bounds(pts);
      return { b, pts, bb, d: Math.hypot(bb.cx - view.width / 2, bb.cy - view.height / 2) };
    })
    .filter(({ bb }) => bb.maxX > -30 && bb.minX < view.width + 30 && bb.maxY > -30 && bb.minY < view.height + 30)
    .sort((a, b) => a.d - b.d)
    .slice(0, detail === 'full' ? 70 : 45);

  const out: React.ReactElement[] = [];
  for (const { b, pts } of drawn) {
    const h = hashOf(b.ring[0]);
    const roof = roofPattern(h);
    const height = detail === 'full' ? 12 + (h % 3) * 4 : 0;
    const key = `b${h}`;

    if (detail === 'full' && height > 0) {
      const roofPts = shift(pts, 0, -height);
      // shadow
      out.push(<Polygon key={`${key}s`} points={ptsStr(shift(pts, height * 0.5, height * 0.5))} fill="#000000" opacity={0.2} />);
      // walls (one quad per footprint edge)
      const wc = wallColor(roof);
      for (let i = 0; i < pts.length - 1; i++) {
        const quad = [pts[i], pts[i + 1], roofPts[i + 1], roofPts[i]];
        out.push(<Polygon key={`${key}w${i}`} points={ptsStr(quad)} fill={wc} stroke="#000000" strokeOpacity={0.15} strokeWidth={0.5} />);
      }
      // roof
      out.push(<Polygon key={`${key}r`} points={ptsStr(roofPts)} fill={`url(#${roof})`} stroke="#1E1E1E" strokeOpacity={0.4} strokeWidth={1} />);
    } else {
      // lite: flat textured footprint
      out.push(<Polygon key={`${key}f`} points={ptsStr(pts)} fill={`url(#${roof})`} stroke="#1E1E1E" strokeOpacity={0.35} strokeWidth={1} />);
    }
  }
  return <G>{out}</G>;
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
