import { colors } from '@/theme';
import { toBlockXY } from './projection';
import type { WorldData } from './worldData';

/**
 * Rasterize live world features into a chunky block grid — our own low-res
 * "voxel tile." Runs once per data fetch (off the render path). Only
 * non-grass blocks are stored; the renderer paints a grass base and overlays
 * these.
 */

export type TerrainType = 'water' | 'park' | 'forest' | 'building' | 'road' | 'road_major' | 'sand';

export interface VoxelGrid {
  /** key "bx,by" → terrain type (grass is implicit / absent). */
  blocks: Map<string, TerrainType>;
}

/** Grass base — the map background. */
export const GRASS = colors.grass;

/** Block fill colors, with a darker bevel shade for depth. */
export const TERRAIN_COLORS: Record<TerrainType, { face: string; shade: string }> = {
  water: { face: colors.water, shade: colors.waterDark },
  park: { face: colors.grassDark, shade: colors.forest },
  forest: { face: colors.forest, shade: '#20361C' },
  building: { face: colors.stoneDark, shade: '#4A4A4A' },
  road: { face: colors.stone, shade: colors.stoneDark },
  road_major: { face: '#A6A6A6', shade: colors.stone },
  sand: { face: colors.sand, shade: '#C4AF74' },
};

/** Painter's-order priority: higher wins when blocks overlap. */
const PRIORITY: Record<TerrainType, number> = {
  forest: 1,
  park: 2,
  sand: 2,
  water: 3,
  building: 4,
  road: 5,
  road_major: 6,
};

const key = (bx: number, by: number) => `${bx},${by}`;

export function voxelize(world: WorldData): VoxelGrid {
  const blocks = new Map<string, TerrainType>();

  const set = (bx: number, by: number, t: TerrainType) => {
    const k = key(bx, by);
    const cur = blocks.get(k);
    if (!cur || PRIORITY[t] >= PRIORITY[cur]) blocks.set(k, t);
  };

  // — polygons: scanline fill in block space —
  for (const poly of world.polygons) {
    const t: TerrainType = poly.kind;
    const ring = poly.ring.map(toBlockXY);
    fillPolygon(ring, (bx, by) => set(bx, by, t));
  }

  // — roads: stamp lines with a class-dependent half-width —
  for (const road of world.roads) {
    const t: TerrainType = road.klass === 'major' ? 'road_major' : 'road';
    const half = road.klass === 'major' ? 1 : road.klass === 'minor' ? 0 : 0;
    const pts = road.pts.map(toBlockXY);
    for (let i = 1; i < pts.length; i++) {
      stampLine(pts[i - 1], pts[i], half, (bx, by) => set(bx, by, t));
    }
  }

  return { blocks };
}

/** Even-odd scanline polygon fill over integer block rows. */
function fillPolygon(ring: Array<{ x: number; y: number }>, plot: (bx: number, by: number) => void) {
  if (ring.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const y0 = Math.floor(minY);
  const y1 = Math.floor(maxY);
  // Guard against pathological giant rings
  if (y1 - y0 > 4000) return;

  for (let by = y0; by <= y1; by++) {
    const yc = by + 0.5;
    const xs: number[] = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if (a.y <= yc ? b.y > yc : b.y <= yc) {
        xs.push(a.x + ((yc - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xStart = Math.floor(xs[k]);
      const xEnd = Math.floor(xs[k + 1]);
      if (xEnd - xStart > 4000) continue;
      for (let bx = xStart; bx <= xEnd; bx++) plot(bx, by);
    }
  }
}

/** DDA line stamp in block space, optionally widened by `half` blocks. */
function stampLine(
  a: { x: number; y: number },
  b: { x: number; y: number },
  half: number,
  plot: (bx: number, by: number) => void,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))) + 1;
  if (steps > 6000) return;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = Math.floor(a.x + dx * t);
    const cy = Math.floor(a.y + dy * t);
    for (let ox = -half; ox <= half; ox++) {
      for (let oy = -half; oy <= half; oy++) plot(cx + ox, cy + oy);
    }
  }
}
