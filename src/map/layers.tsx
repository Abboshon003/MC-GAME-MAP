import React from 'react';
import { G, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fontFamilies } from '@/theme';
import type { LatLng } from '@/nav/types';
import {
  blockScreenSize,
  cellHash,
  projectBlockCorner,
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

/** Drop a duplicated closing point so a rectangle reads as 4 corners + close. */
function dedupeRing(ring: LatLng[]): LatLng[] {
  const a = ring[0];
  const z = ring[ring.length - 1];
  if (ring.length > 3 && Math.abs(a.lat - z.lat) < 1e-9 && Math.abs(a.lon - z.lon) < 1e-9) {
    return ring;
  }
  return [...ring, a];
}

/* ————————————————————————————————————————————————————————————————
 * IsoScene — everything with volume (buildings + trees), depth-sorted
 * back-to-front so nearer volumes overlap farther ones correctly.
 * Directional shadows are drawn first as a ground pass.
 * ———————————————————————————————————————————————————————————————— */

interface SceneItem {
  sortY: number;
  el: React.ReactElement;
  shadow?: React.ReactElement;
}

export function IsoScene({
  world,
  grid,
  proj,
  camera,
  view,
  iso,
  detail,
}: {
  world: WorldData | null;
  grid: VoxelGrid | null;
  proj: Projector;
  camera: MapCamera;
  view: Viewport;
  iso: boolean;
  detail: 'full' | 'lite';
}) {
  const items: SceneItem[] = [];

  if (world) collectBuildings(items, world, proj, view, iso, detail);
  if (grid && detail === 'full') collectTrees(items, grid, camera, view, iso);

  items.sort((a, b) => a.sortY - b.sortY);

  return (
    <G>
      <G>{items.map((i) => i.shadow).filter(Boolean)}</G>
      <G>{items.map((i) => i.el)}</G>
    </G>
  );
}

/* ————————————————————————— buildings ————————————————————————— */

function collectBuildings(
  items: SceneItem[],
  world: WorldData,
  proj: Projector,
  view: Viewport,
  iso: boolean,
  detail: 'full' | 'lite',
) {
  const buildings = world.polygons.filter((p) => p.kind === 'building' && p.ring.length >= 3);

  const drawn = buildings
    .map((b) => {
      const ring = dedupeRing(b.ring);
      const base = ring.map((p) => proj(p));
      const bb = bounds(base);
      return { b, ring, base, bb, d: Math.hypot(bb.cx - view.width / 2, bb.cy - view.height / 2) };
    })
    .filter(({ bb }) => onScreen(bb, view))
    .sort((a, b) => a.d - b.d)
    .slice(0, detail === 'full' ? 90 : 50);

  for (const { b, ring, base, bb } of drawn) {
    const h = hashOf(b.ring[0]);
    const roof = roofPattern(h);
    const key = `b${h}-${Math.round(bb.cx)}`;
    const isHouse = base.length === 5;
    const size = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY);
    const height = !iso || detail === 'lite'
      ? 0
      : isHouse
        ? 10 + (h % 3) * 4
        : Math.min(34, 16 + (h % 4) * 6 + size * 0.06);

    if (height === 0) {
      // flat mode: aerial gable/flat roof footprint (previous look)
      items.push({
        sortY: bb.maxY,
        shadow: (
          <Polygon key={`${key}s`} points={ptsStr(base.map((p) => ({ x: p.x + 3, y: p.y + 3 })))} fill="#000000" opacity={0.22} />
        ),
        el: isHouse ? (
          <FlatGable key={key} pts={base} roof={roof} hash={h} />
        ) : (
          <Polygon key={key} points={ptsStr(base)} fill={`url(#${roof})`} stroke="#1E1E1E" strokeOpacity={0.5} strokeWidth={1.5} />
        ),
      });
      continue;
    }

    const top = ring.map((p) => proj(p, height));
    const wallsBack: React.ReactElement[] = [];
    const wallsFront: React.ReactElement[] = [];
    for (let i = 0; i < base.length - 1; i++) {
      const midY = (base[i].y + base[i + 1].y) / 2;
      const facing = midY >= bb.cy; // front (viewer-facing) edges are lower on screen
      // shade by edge direction: left-lit / right-shaded
      const dx = base[i + 1].x - base[i].x;
      const wc = wallColor(roof);
      const quad = (
        <Polygon
          key={`${key}w${i}`}
          points={ptsStr([base[i], base[i + 1], top[i + 1], top[i]])}
          fill={wc}
          opacity={1}
          stroke="#141414"
          strokeOpacity={0.35}
          strokeWidth={0.75}
        />
      );
      const shade = (
        <Polygon
          key={`${key}ws${i}`}
          points={ptsStr([base[i], base[i + 1], top[i + 1], top[i]])}
          fill={dx > 0 ? '#FFFFFF' : '#000000'}
          opacity={dx > 0 ? 0.1 : 0.22}
        />
      );
      (facing ? wallsFront : wallsBack).push(quad, shade);
    }

    let roofEl: React.ReactElement;
    if (isHouse && iso) {
      roofEl = <IsoGable key={`${key}r`} base={base} top={top} roof={roof} hash={h} ring={ring} proj={proj} height={height} />;
    } else {
      roofEl = (
        <G key={`${key}r`}>
          <Polygon points={ptsStr(top)} fill={`url(#${roof})`} stroke="#1E1E1E" strokeOpacity={0.55} strokeWidth={1.5} />
          {detail === 'full' && size > 30 && (
            <Rect x={bounds(top).cx - 4} y={bounds(top).cy - 3} width={6} height={5} fill="#6E6E6E" stroke="#3A3A3A" strokeWidth={1} />
          )}
        </G>
      );
    }

    // shadow cast toward lower-right by height
    const shDx = 2 + height * 0.45;
    const shDy = 1 + height * 0.3;
    items.push({
      sortY: bb.maxY,
      shadow: (
        <Polygon
          key={`${key}s`}
          points={ptsStr(base.map((p) => ({ x: p.x + shDx, y: p.y + shDy })))}
          fill="#000000"
          opacity={0.18}
        />
      ),
      el: (
        <G key={key}>
          {wallsBack}
          {wallsFront}
          {roofEl}
        </G>
      ),
    });
  }
}

/** Pitched gable roof in iso: ridge raised above the eaves, two shaded planes. */
function IsoGable({
  base, top, roof, hash, ring, proj, height,
}: {
  base: Pt[]; top: Pt[]; roof: string; hash: number; ring: LatLng[]; proj: Projector; height: number;
}) {
  const [c0, c1, c2, c3] = ring;
  const e01 = Math.hypot(top[1].x - top[0].x, top[1].y - top[0].y);
  const e12 = Math.hypot(top[2].x - top[1].x, top[2].y - top[1].y);
  const longFirst = e01 >= e12;
  const ridgeH = height + 7 + (hash % 3) * 2;
  const mid = (a: LatLng, b: LatLng): LatLng => ({ lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 });
  const r0 = proj(longFirst ? mid(c0, c3) : mid(c0, c1), ridgeH);
  const r1 = proj(longFirst ? mid(c1, c2) : mid(c3, c2), ridgeH);
  const planeA: Pt[] = longFirst ? [top[0], top[1], r1, r0] : [top[0], r0, r1, top[3]];
  const planeB: Pt[] = longFirst ? [r0, r1, top[2], top[3]] : [r0, top[1], top[2], r1];
  const litA = bounds(planeA).cy <= bounds(planeB).cy;
  const gableA: Pt[] = longFirst ? [top[0], r0, top[3]] : [top[0], r0, top[1]];
  const gableB: Pt[] = longFirst ? [top[1], r1, top[2]] : [top[3], r1, top[2]];

  return (
    <G>
      {/* gable end triangles */}
      <Polygon points={ptsStr(gableA)} fill={wallColor(roof)} stroke="#141414" strokeOpacity={0.3} strokeWidth={0.75} />
      <Polygon points={ptsStr(gableB)} fill={wallColor(roof)} stroke="#141414" strokeOpacity={0.3} strokeWidth={0.75} />
      {/* roof planes */}
      <Polygon points={ptsStr(planeA)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(planeA)} fill={litA ? '#FFFFFF' : '#000000'} opacity={litA ? 0.16 : 0.2} />
      <Polygon points={ptsStr(planeB)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(planeB)} fill={litA ? '#000000' : '#FFFFFF'} opacity={litA ? 0.2 : 0.16} />
      <Polyline points={ptsStr([r0, r1])} fill="none" stroke="#2A1D10" strokeOpacity={0.8} strokeWidth={2} />
      {hash % 3 === 0 && (
        <Rect x={(r0.x + r1.x) / 2 - 3} y={(r0.y + r1.y) / 2 - 6} width={6} height={7} fill="#6E6E6E" stroke="#3A3A3A" strokeWidth={1} />
      )}
    </G>
  );
}

/** Flat-mode aerial gable (kept for navigating view). */
function FlatGable({ pts, roof, hash }: { pts: Pt[]; roof: string; hash: number }) {
  const [c0, c1, c2, c3] = pts;
  const e01 = Math.hypot(c1.x - c0.x, c1.y - c0.y);
  const e12 = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  const longFirst = e01 >= e12;
  const r0: Pt = longFirst ? { x: (c0.x + c3.x) / 2, y: (c0.y + c3.y) / 2 } : { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
  const r1: Pt = longFirst ? { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 } : { x: (c3.x + c2.x) / 2, y: (c3.y + c2.y) / 2 };
  const halfA: Pt[] = longFirst ? [c0, c1, r1, r0] : [c0, r0, r1, c3];
  const halfB: Pt[] = longFirst ? [r0, r1, c2, c3] : [r0, c1, c2, r1];
  const litA = bounds(halfA).cy + bounds(halfA).cx <= bounds(halfB).cy + bounds(halfB).cx;
  return (
    <G>
      <Polygon points={ptsStr(halfA)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(halfA)} fill={litA ? '#FFFFFF' : '#000000'} opacity={litA ? 0.14 : 0.2} />
      <Polygon points={ptsStr(halfB)} fill={`url(#${roof})`} />
      <Polygon points={ptsStr(halfB)} fill={litA ? '#000000' : '#FFFFFF'} opacity={litA ? 0.2 : 0.14} />
      <Polygon points={ptsStr(pts)} fill="none" stroke="#1E1E1E" strokeOpacity={0.55} strokeWidth={1.5} />
      <Polyline points={ptsStr([r0, r1])} fill="none" stroke="#2A1D10" strokeOpacity={0.7} strokeWidth={2} />
      {hash % 3 === 0 && (
        <Rect x={(r0.x + r1.x) / 2 - 3} y={(r0.y + r1.y) / 2 - 3} width={6} height={6} fill="#6E6E6E" stroke="#3A3A3A" strokeWidth={1} />
      )}
    </G>
  );
}

/* ————————————————————————— trees ————————————————————————— */

function collectTrees(
  items: SceneItem[],
  grid: VoxelGrid,
  camera: MapCamera,
  view: Viewport,
  iso: boolean,
) {
  const size = blockScreenSize(camera);
  let count = 0;
  for (const [k, type] of grid.blocks) {
    if (count >= 110) break;
    if (type !== 'park' && type !== 'forest') continue;
    const comma = k.indexOf(',');
    const bx = +k.slice(0, comma);
    const by = +k.slice(comma + 1);
    if (cellHash(bx, by, 5) > (type === 'forest' ? 0.6 : 0.38)) continue;
    const p = projectBlockCorner(bx, by, camera, view, iso);
    if (p.x < -20 || p.x > view.width + 20 || p.y < -30 || p.y > view.height + 20) continue;
    const jx = cellHash(bx, by, 9) * size * 0.5;
    const jy = cellHash(bx, by, 17) * size * 0.5;
    const r = Math.max(5, size * 0.4);
    const x = p.x + jx;
    const y = p.y + jy;
    items.push({
      sortY: y,
      shadow: iso ? (
        <Polygon
          key={`ts${k}`}
          points={ptsStr([
            { x: x + 2, y: y + 2 },
            { x: x + r * 1.6 + 2, y: y + 2 },
            { x: x + r * 1.2 + 2, y: y + r * 0.7 + 2 },
            { x: x - r * 0.4 + 2, y: y + r * 0.7 + 2 },
          ])}
          fill="#000000"
          opacity={0.16}
        />
      ) : undefined,
      el: iso ? <IsoTree key={`t${k}`} x={x} y={y} r={r} /> : <FlatTree key={`t${k}`} x={x} y={y} r={r} />,
    });
    count++;
  }
}

/** Voxel tree in iso: trunk + leaf cube with lit top, mid left, dark right. */
function IsoTree({ x, y, r }: { x: number; y: number; r: number }) {
  const h = r * 1.5; // canopy lift
  const w = r * 0.9; // half width of canopy diamond
  const d = w * 0.55; // diamond half-height
  const cy = y - h;
  return (
    <G>
      {/* trunk */}
      <Rect x={x - r * 0.16} y={y - h * 0.45} width={r * 0.32} height={h * 0.5} fill="#5C3E22" />
      {/* canopy: left face, right face, top diamond */}
      <Polygon points={ptsStr([{ x: x - w, y: cy }, { x, y: cy + d }, { x, y: cy + d + r }, { x: x - w, y: cy + r }])} fill="#2E7D32" />
      <Polygon points={ptsStr([{ x: x + w, y: cy }, { x, y: cy + d }, { x, y: cy + d + r }, { x: x + w, y: cy + r }])} fill="#1F5A23" />
      <Polygon points={ptsStr([{ x, y: cy - d }, { x: x + w, y: cy }, { x, y: cy + d }, { x: x - w, y: cy }])} fill="#43A047" />
    </G>
  );
}

/** Flat-mode tree (navigating view). */
function FlatTree({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G>
      <Rect x={x - r * 0.2} y={y} width={r * 0.4} height={r} fill="#5C3E22" />
      <Rect x={x - r} y={y - r * 0.4} width={r * 2} height={r} fill="#2E7D32" />
      <Rect x={x - r * 0.55} y={y - r * 1.1} width={r * 1.1} height={r * 1.4} fill="#358A38" />
      <Rect x={x - r * 0.2} y={y - r} width={r * 0.4} height={r * 0.4} fill="#43A047" />
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
    const pts = road.pts.map((p) => proj(p));
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
    const pts = road.pts.map((p) => proj(p));
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
    // skip labels that would pile up on an already-placed one
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
        {/* ink outline behind, fill on top */}
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
