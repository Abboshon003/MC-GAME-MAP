import type { LatLng } from './types';

/** Earth radius (meters). */
const R = 6371008.8;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Local planar projection around a reference latitude — accurate enough for
 * snapping within a city-scale route and much cheaper than true geodesics.
 */
function toXY(p: LatLng, refLat: number): { x: number; y: number } {
  const k = Math.cos(toRad(refLat));
  return { x: toRad(p.lon) * k * R, y: toRad(p.lat) * R };
}

export interface RouteProjection {
  /** Index of the segment start coord */
  segIndex: number;
  /** 0..1 position within the segment */
  t: number;
  /** The snapped point */
  point: LatLng;
  /** Perpendicular distance (meters) from the query point */
  distanceMeters: number;
}

/**
 * Snap a point to a polyline: nearest point on any segment.
 * `hintIndex` biases the search window forward from the previous snap so a
 * looping route doesn't snap backwards.
 */
export function projectOntoRoute(
  point: LatLng,
  coords: LatLng[],
  hintIndex?: number,
): RouteProjection {
  const refLat = point.lat;
  const p = toXY(point, refLat);
  let best: RouteProjection = {
    segIndex: 0,
    t: 0,
    point: coords[0],
    distanceMeters: Number.POSITIVE_INFINITY,
  };

  const start = hintIndex !== undefined ? Math.max(0, hintIndex - 5) : 0;
  const end =
    hintIndex !== undefined
      ? Math.min(coords.length - 1, hintIndex + 60)
      : coords.length - 1;

  const consider = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const a = toXY(coords[i], refLat);
      const b = toXY(coords[i + 1], refLat);
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const len2 = abx * abx + aby * aby;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
      const qx = a.x + t * abx;
      const qy = a.y + t * aby;
      const d = Math.hypot(p.x - qx, p.y - qy);
      if (d < best.distanceMeters) {
        const lat = coords[i].lat + t * (coords[i + 1].lat - coords[i].lat);
        const lon = coords[i].lon + t * (coords[i + 1].lon - coords[i].lon);
        best = { segIndex: i, t, point: { lat, lon }, distanceMeters: d };
      }
    }
  };

  consider(start, end);
  // If the windowed search found nothing close, fall back to the whole line.
  if (hintIndex !== undefined && best.distanceMeters > 150) {
    consider(0, coords.length - 1);
  }
  return best;
}

/** Cumulative distances (meters) along a polyline; [0, d1, d1+d2, ...]. */
export function cumulativeDistances(coords: LatLng[]): number[] {
  const out = new Array<number>(coords.length);
  out[0] = 0;
  for (let i = 1; i < coords.length; i++) {
    out[i] = out[i - 1] + haversineMeters(coords[i - 1], coords[i]);
  }
  return out;
}

/** Along-route offset in meters for a projection result. */
export function offsetOfProjection(proj: RouteProjection, cumulative: number[], coords: LatLng[]): number {
  const segLen =
    proj.segIndex + 1 < coords.length
      ? haversineMeters(coords[proj.segIndex], coords[proj.segIndex + 1])
      : 0;
  return cumulative[proj.segIndex] + proj.t * segLen;
}

/**
 * Format a distance in US customary units (default): feet under 0.1 mi,
 * then miles. e.g. "300 ft" / "0.4 mi" / "12 mi".
 */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = meters * 3.28084;
    return `${Math.max(0, Math.round(feet / 10) * 10)} ft`;
  }
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/** Format seconds: "3 min" / "1 h 12 min". */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}
