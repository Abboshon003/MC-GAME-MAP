import type { LatLng } from '@/nav/types';

/**
 * Web-mercator camera math for the parchment map.
 * A camera is a center + zoom; `project` maps geography to view pixels.
 */

export interface MapCamera {
  center: LatLng;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

const TILE = 256;

function worldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE * 2 ** zoom;
}

function worldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.05, Math.min(85.05, lat));
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE * 2 ** zoom;
}

/** Geographic point → pixel position inside the viewport. */
export function project(p: LatLng, camera: MapCamera, view: Viewport): { x: number; y: number } {
  return {
    x: worldX(p.lon, camera.zoom) - worldX(camera.center.lon, camera.zoom) + view.width / 2,
    y: worldY(p.lat, camera.zoom) - worldY(camera.center.lat, camera.zoom) + view.height / 2,
  };
}

/** Camera that fits a set of points with padding (overview mode). */
export function fitBounds(points: LatLng[], view: Viewport, paddingPx = 48): MapCamera {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const center: LatLng = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  };
  // Find the max zoom at which the bbox fits.
  for (let zoom = 18; zoom >= 2; zoom -= 0.25) {
    const w = worldX(Math.max(...lons), zoom) - worldX(Math.min(...lons), zoom);
    const h = worldY(Math.min(...lats), zoom) - worldY(Math.max(...lats), zoom);
    if (w <= view.width - paddingPx * 2 && h <= view.height - paddingPx * 2) {
      return { center, zoom };
    }
  }
  return { center, zoom: 2 };
}

/** Integer world-cell coordinates covering the viewport at a cell zoom. */
export function visibleCells(
  camera: MapCamera,
  view: Viewport,
  cellZoom: number,
): Array<{ cx: number; cy: number; x: number; y: number; size: number }> {
  const scale = 2 ** (camera.zoom - cellZoom);
  const size = TILE * scale;
  const centerX = worldX(camera.center.lon, cellZoom);
  const centerY = worldY(camera.center.lat, cellZoom);
  const halfW = view.width / 2 / (TILE * scale);
  const halfH = view.height / 2 / (TILE * scale);
  const out: Array<{ cx: number; cy: number; x: number; y: number; size: number }> = [];
  const x0 = Math.floor((centerX - halfW * TILE) / TILE);
  const x1 = Math.floor((centerX + halfW * TILE) / TILE);
  const y0 = Math.floor((centerY - halfH * TILE) / TILE);
  const y1 = Math.floor((centerY + halfH * TILE) / TILE);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      out.push({
        cx,
        cy,
        x: (cx * TILE - centerX) * scale + view.width / 2,
        y: (cy * TILE - centerY) * scale + view.height / 2,
        size,
      });
    }
  }
  return out;
}

/** Deterministic 2D hash → 0..1 (stable terrain decoration per cell). */
export function cellHash(cx: number, cy: number, salt = 0): number {
  let h = (cx * 374761393 + cy * 668265263 + salt * 1274126177) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = (h * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
