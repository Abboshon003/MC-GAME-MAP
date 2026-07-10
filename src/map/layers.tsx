import React from 'react';
import { G, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fontFamilies } from '@/theme';
import type { LatLng } from '@/nav/types';
import {
  blockScreenSize,
  cellHash,
  projectBlock,
  type MapCamera,
  type Projector,
  type Viewport,
} from './projection';
import type { VoxelGrid } from './voxelize';
import type { WorldData } from './worldData';
import { roofPattern, wallColor } from './textures';

type Pt = { x: number; y: number };

const ptsStr = (pts: Pt[]): string => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

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

const onScreen = (bb: ReturnType<typeof bounds>, view: Viewport, pad = 40) =>
  bb.maxX > -pad && bb.minX < view.width + pad && bb.maxY > -pad && bb.minY < view.height + pad;

/** Close an open OSM ring so a rectangle reads as 4 corners + closing point. */
function closeRing(ring: LatLng[]): LatLng[] {
  const a = ring[0];
  const z = ring[ring.length - 1];
  if (ring.length > 3 && Math.abs(a.lat - z.lat) < 1e-9 && Math.abs(a.lon - z.lon) < 1e-9) {
    return ring;
  }
  return [...ring, a];
}

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/* ————————————————————————————————————————————————————————————————
 * Buildings — the aerial "Minecraft rooftop" pass.
 *
 * Every footprint gets a dark plinth + hard drop shadow. Rectangular
 * houses draw as pitched roofs seen from above — gable (ridge full-span)
 * or hip (ridge pulled in, four planes) — with a sunlit and a shaded
 * side, eaves outline, and the occasional chimney or gold skylight.
 * Complex/large footprints read as flat city roofs: parapet inset,
 * rooftop vents, perimeter shading.
 * ———————————————————————————————————————————————————————————————— */

export function Buildings({
  world, proj, view, detail,
}: { world: WorldData; proj: Projector; view: Viewport; detail: 'full' | 'lite' }) {
  const buildings = world.polygons.filter((p) => p.kind === 'building' && p.ring.length >= 3);

  const drawn = buildings
    .map((b) => {
      const pts = closeRing(b.ring).map(proj);
      const bb = bounds(pts);
      return { b, pts, bb, d: Math.hypot(bb.cx - view.width / 2, bb.cy - view.height / 2) };
    })
    .filter(({ bb }) => onScreen(bb, view))
    .sort((a, b) => a.d - b.d)
    .slice(0, detail === 'full' ? 110 : 60);

  const shadows: React.ReactElement[] = [];
  const bodies: React.ReactElement[] = [];

  for (const { b, pts, bb } of drawn) {
    const h = hashOf(b.ring[0]);
    const key = `b${h}-${Math.round(bb.cx)}-${Math.round(bb.cy)}`;
    const roof = roofPattern(h);
    const isHouse = pts.length === 5 && Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY) < 120;

    shadows.push(
      <Polygon
        key={`${key}s`}
        points={ptsStr(pts.map((p) => ({ x: p.x + 3.5, y: p.y + 3.5 })))}
        fill="#000000"
        opacity={0.24}
      />,
    );

    if (isHouse) {
      bodies.push(
        <House key={key} pts={pts} roof={roof} hash={h} full={detail === 'full'} />,
      );
    } else {
      bodies.push(
        <FlatRoof key={key} pts={pts} bb={bb} roof={roof} full={detail === 'full'} />,
      );
    }
  }

  return (
    <G>
      <G>{shadows}</G>
      <G>{bodies}</G>
    </G>
  );
}

/** Rectangular house: pitched roof from above — gable or hip by hash. */
function House({ pts, roof, hash, full }: { pts: Pt[]; roof: string; hash: number; full: boolean }) {
  const [c0, c1, c2, c3] = pts;
  const e01 = Math.hypot(c1.x - c0.x, c1.y - c0.y);
  const e12 = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  const longFirst = e01 >= e12;

  // ridge endpoints at the midline of the short sides
  let r0: Pt = longFirst ? lerp(c0, c3, 0.5) : lerp(c0, c1, 0.5);
  let r1: Pt = longFirst ? lerp(c1, c2, 0.5) : lerp(c3, c2, 0.5);
  const hip = full && hash % 3 === 2;
  if (hip) {
    // pull the ridge inward → four roof planes
    const r0i = lerp(r0, r1, 0.28);
    const r1i = lerp(r1, r0, 0.28);
    r0 = r0i;
    r1 = r1i;
  }

  const planeA: Pt[] = longFirst ? [c0, c1, r1, r0] : [c0, r0, r1, c3];
  const planeB: Pt[] = longFirst ? [r0, r1, c2, c3] : [r0, c1, c2, r1];
  const litA = bounds(planeA).cy + bounds(planeA).cx <= bounds(planeB).cy + bounds(planeB).cx;

  const wall = wallColor(roof);
  const ridgeMid = lerp(r0, r1, 0.34 + (hash % 4) * 0.1);

  return (
    <G>
      {/* plinth: slightly darker base so the house sits in the world */}
      <Polygon points={ptsStr(pts)} fill={wall} />
      {/* roof planes */}
      <Polygon points={ptsStr(planeA)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(planeA)} fill={litA ? '#FFFFFF' : '#000000'} opacity={litA ? 0.16 : 0.2} />
      <Polygon points={ptsStr(planeB)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(planeB)} fill={litA ? '#000000' : '#FFFFFF'} opacity={litA ? 0.2 : 0.16} />
      {/* hip end triangles */}
      {hip && (
        <>
          <Polygon points={ptsStr(longFirst ? [c0, r0, c3] : [c0, r0, c1])} fill={`url(#${roof})`} />
          <Polygon points={ptsStr(longFirst ? [c0, r0, c3] : [c0, r0, c1])} fill="#000000" opacity={0.1} />
          <Polygon points={ptsStr(longFirst ? [c1, r1, c2] : [c3, r1, c2])} fill={`url(#${roof})`} />
          <Polygon points={ptsStr(longFirst ? [c1, r1, c2] : [c3, r1, c2])} fill="#FFFFFF" opacity={0.08} />
        </>
      )}
      {/* eaves + ridge */}
      <Polygon points={ptsStr(pts)} fill="none" stroke="#17130D" strokeOpacity={0.65} strokeWidth={1.75} />
      <Polyline points={ptsStr([r0, r1])} fill="none" stroke="#2A1D10" strokeOpacity={0.85} strokeWidth={2.25} />
      {/* charm: chimney on some roofs, gold skylight on a few */}
      {full && hash % 3 === 0 && (
        <G>
          <Rect x={ridgeMid.x - 3.5} y={ridgeMid.y - 3.5} width={7} height={7} fill="#787878" stroke="#2E2E2E" strokeWidth={1.25} />
          <Rect x={ridgeMid.x - 1.75} y={ridgeMid.y - 1.75} width={3.5} height={3.5} fill="#232323" />
        </G>
      )}
      {full && hash % 7 === 5 && (
        <Rect x={ridgeMid.x + 5} y={ridgeMid.y + 4} width={5} height={5} fill={colors.routeGold} stroke="#5A4310" strokeWidth={1} opacity={0.9} />
      )}
    </G>
  );
}

/** Large/complex footprint: flat city roof with parapet and vents. */
function FlatRoof({
  pts, bb, roof, full,
}: { pts: Pt[]; bb: ReturnType<typeof bounds>; roof: string; full: boolean }) {
  const w = bb.maxX - bb.minX;
  const h = bb.maxY - bb.minY;
  // parapet: shrink footprint toward centroid for the inner roof surface
  const inner = pts.map((p) => lerp(p, { x: bb.cx, y: bb.cy }, 0.12));
  return (
    <G>
      <Polygon points={ptsStr(pts)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(pts)} fill="#000000" opacity={0.16} />
      <Polygon points={ptsStr(inner)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(pts)} fill="none" stroke="#17130D" strokeOpacity={0.65} strokeWidth={1.75} />
      {full && w > 30 && h > 24 && (
        <G>
          <Rect x={bb.cx - 7} y={bb.cy - 4} width={7} height={6} fill="#6E6E6E" stroke="#3A3A3A" strokeWidth={1} />
          <Rect x={bb.cx + 3} y={bb.cy + 2} width={5} height={5} fill="#7B7B7B" stroke="#3A3A3A" strokeWidth={1} />
          <Rect x={bb.cx - 2} y={bb.cy - 10} width={4} height={4} fill="#5E5E5E" stroke="#3A3A3A" strokeWidth={1} />
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
    if (count >= 110) break;
    if (type !== 'park' && type !== 'forest') continue;
    const comma = k.indexOf(',');
    const bx = +k.slice(0, comma);
    const by = +k.slice(comma + 1);
    if (cellHash(bx, by, 5) > (type === 'forest' ? 0.6 : 0.38)) continue;
    const p = projectBlock(bx, by, camera, view);
    if (p.x < -20 || p.x > view.width + 20 || p.y < -20 || p.y > view.height + 20) continue;
    const jx = cellHash(bx, by, 9) * size * 0.5;
    const jy = cellHash(bx, by, 17) * size * 0.5;
    out.push(<TreeSprite key={`t${k}`} x={p.x + jx} y={p.y + jy} r={Math.max(5, size * 0.42)} />);
    count++;
  }
  return <G>{out}</G>;
}

/** Aerial tree: blocky plus-shaped canopy, dark rim, lit crown, shadow. */
function TreeSprite({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G>
      <Rect x={x - r * 0.8} y={y - r * 0.6} width={r * 2} height={r * 1.6} fill="#000000" opacity={0.16} transform={`translate(${r * 0.3}, ${r * 0.3})`} />
      {/* rim (darkest, underneath) */}
      <Rect x={x - r} y={y - r * 0.62} width={r * 2} height={r * 1.24} fill="#1F4D22" />
      <Rect x={x - r * 0.62} y={y - r} width={r * 1.24} height={r * 2} fill="#1F4D22" />
      {/* body */}
      <Rect x={x - r * 0.85} y={y - r * 0.5} width={r * 1.7} height={r} fill="#2E7D32" />
      <Rect x={x - r * 0.5} y={y - r * 0.85} width={r} height={r * 1.7} fill="#2E7D32" />
      {/* lit crown */}
      <Rect x={x - r * 0.4} y={y - r * 0.4} width={r * 0.8} height={r * 0.8} fill="#43A047" />
      <Rect x={x - r * 0.15} y={y - r * 0.15} width={r * 0.4} height={r * 0.4} fill="#57B85C" />
    </G>
  );
}

/* ————————————————————————— road markings ————————————————————————— */

export function RoadMarkings({
  world, proj, view,
}: { world: WorldData; proj: Projector; view: Viewport }) {
  const out: React.ReactElement[] = [];
  let n = 0;
  for (const road of world.roads) {
    if (road.klass !== 'major') continue;
    if (n >= 40) break;
    const pts = road.pts.map(proj);
    const bb = bounds(pts);
    if (!onScreen(bb, view, 0)) continue;
    out.push(
      <Polyline key={`rm${n}`} points={ptsStr(pts)} fill="none" stroke="#E9C93B" strokeWidth={1.5} strokeDasharray="6 7" strokeOpacity={0.85} />,
    );
    n++;
  }
  return <G>{out}</G>;
}

/* ————————————————————————— street labels ————————————————————————— */

export function StreetLabels({
  world, proj, view,
}: { world: WorldData; proj: Projector; view: Viewport }) {
  const byName = new Map<string, { pts: Pt[]; len: number }>();
  for (const road of world.roads) {
    if (!road.name) continue;
    const pts = road.pts.map(proj);
    const bb = bounds(pts);
    if (!onScreen(bb, view, 0)) continue;
    const len = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
    const cur = byName.get(road.name);
    if (!cur || len > cur.len) byName.set(road.name, { pts, len });
  }

  const labels = [...byName.entries()]
    .filter(([, v]) => v.len > 70)
    .sort((a, b) => b[1].len - a[1].len)
    .slice(0, 10);

  const out: React.ReactElement[] = [];
  const placed: Pt[] = [];
  for (const [name, { pts }] of labels) {
    const mid = pts[Math.floor(pts.length / 2)];
    if (placed.some((q) => Math.hypot(q.x - mid.x, q.y - mid.y) < 70)) continue;
    placed.push(mid);
    const a = pts[0];
    const b = pts[pts.length - 1];
    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const common = {
      x: mid.x,
      y: mid.y,
      fontFamily: fontFamilies.body,
      fontSize: 13,
      textAnchor: 'middle' as const,
      transform: `rotate(${angle.toFixed(1)}, ${mid.x.toFixed(1)}, ${mid.y.toFixed(1)})`,
    };
    out.push(
      <G key={`sl${name}`}>
        <SvgText {...common} fill="none" stroke="#1E1E1E" strokeWidth={3}>
          {name}
        </SvgText>
        <SvgText {...common} fill={colors.textLight}>
          {name}
        </SvgText>
      </G>,
    );
  }
  return <G>{out}</G>;
}
