import type { LatLng } from '@/nav/types';

/**
 * Scene-space mapping for the 3D voxel world.
 * Scene units are METERS on a local tangent plane around `origin`:
 *   +X = east, +Z = south, +Y = up.
 * Equirectangular is plenty accurate at neighborhood scale.
 */

export interface SceneOrigin {
  origin: LatLng;
  metersPerDegLat: number;
  metersPerDegLon: number;
}

export function makeOrigin(origin: LatLng): SceneOrigin {
  const metersPerDegLat = 111_320;
  const metersPerDegLon = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return { origin, metersPerDegLat, metersPerDegLon };
}

export function toScene(p: LatLng, o: SceneOrigin): { x: number; z: number } {
  return {
    x: (p.lon - o.origin.lon) * o.metersPerDegLon,
    z: -(p.lat - o.origin.lat) * o.metersPerDegLat,
  };
}

/** Ground size (meters) of one voxel block at the origin latitude. */
export function blockMeters(o: SceneOrigin): number {
  // BLOCK px at BLOCK_ZOOM in web-mercator: 156543.03392 m/px at z0
  const metersPerPx = (156543.03392 * Math.cos((o.origin.lat * Math.PI) / 180)) / 2 ** 17;
  return 16 * metersPerPx;
}

/** Scene position of a block's center (block indices from voxelize). */
export function blockCenterScene(
  bx: number,
  by: number,
  o: SceneOrigin,
): { x: number; z: number } {
  // invert projection.toBlockXY: block index -> lat/lon of block center
  const TILE = 256 * 2 ** 17;
  const px = ((bx + 0.5) * 16) / TILE;
  const py = ((by + 0.5) * 16) / TILE;
  const lon = px * 360 - 180;
  const n = Math.PI - 2 * Math.PI * py;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return toScene({ lat, lon }, o);
}
