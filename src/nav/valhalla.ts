import { cumulativeDistances } from './geo';
import type { LatLng, Route, RouteProfile, RouteStep } from './types';

/**
 * Valhalla routing provider (FOSSGIS public instance — free, keyless).
 * Supports walking and cycling as well as driving, which OSRM's demo server
 * does not. Returns the same `Route` shape as the OSRM provider so screens
 * are agnostic to which engine produced the route.
 */
const VALHALLA = 'https://valhalla1.openstreetmap.de';

const COSTING: Record<RouteProfile, string> = {
  drive: 'auto',
  walk: 'pedestrian',
  bike: 'bicycle',
};

export async function fetchValhallaRoute(
  origin: LatLng,
  destination: LatLng,
  destinationName: string,
  profile: RouteProfile,
  flavor: (kind: RouteStep['kind'], road: string | undefined, dest: string, exit?: number) => string,
): Promise<Route> {
  const body = {
    locations: [
      { lat: origin.lat, lon: origin.lon },
      { lat: destination.lat, lon: destination.lon },
    ],
    costing: COSTING[profile],
    units: 'kilometers',
    directions_type: 'maneuvers',
  };
  const res = await fetch(`${VALHALLA}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = (await res.json()) as ValhallaResponse;
  const trip = data.trip;
  if (!trip || trip.status !== 0 || !trip.legs?.length) throw new Error('No route found');

  const coords: LatLng[] = [];
  const steps: RouteStep[] = [];
  for (const leg of trip.legs) {
    const legCoords = decodePolyline(leg.shape, 6);
    const base = coords.length;
    // Avoid duplicating the shared vertex between legs
    coords.push(...(base === 0 ? legCoords : legCoords.slice(1)));
    const cumSoFar = cumulativeDistances(coords);
    for (const m of leg.maneuvers) {
      const idx = Math.min(base + m.begin_shape_index, coords.length - 1);
      const kind = valhallaKind(m.type);
      steps.push({
        instruction: flavor(kind, m.street_names?.[0], destinationName, m.roundabout_exit_count),
        kind,
        location: coords[idx],
        distanceMeters: m.length * 1000,
        offsetMeters: cumSoFar[idx],
        roadName: m.street_names?.[0],
      });
    }
  }

  const cumulative = cumulativeDistances(coords);
  steps.sort((a, b) => a.offsetMeters - b.offsetMeters);

  return {
    coords,
    cumulative,
    distanceMeters: trip.summary.length * 1000,
    durationSeconds: trip.summary.time,
    steps,
    destinationName,
  };
}

interface ValhallaResponse {
  trip?: {
    status: number;
    summary: { length: number; time: number };
    legs: Array<{
      shape: string;
      summary: { length: number; time: number };
      maneuvers: Array<{
        type: number;
        length: number;
        time: number;
        begin_shape_index: number;
        street_names?: string[];
        roundabout_exit_count?: number;
      }>;
    }>;
  };
}

/** Valhalla numeric maneuver type → our RouteStep kind. */
function valhallaKind(t: number): RouteStep['kind'] {
  switch (t) {
    case 1:
    case 2:
    case 3:
      return 'depart';
    case 4:
    case 5:
    case 6:
      return 'arrive';
    case 9:
    case 18:
    case 20:
    case 23:
      return 'slight-right';
    case 10:
      return 'right';
    case 11:
      return 'sharp-right';
    case 12:
    case 13:
      return 'uturn';
    case 14:
      return 'sharp-left';
    case 15:
      return 'left';
    case 16:
    case 19:
    case 21:
    case 24:
      return 'slight-left';
    case 25:
    case 36:
    case 37:
      return 'merge';
    case 26:
    case 27:
      return 'roundabout';
    default:
      return 'straight';
  }
}

/** Decode an encoded polyline (Valhalla uses precision 6). */
export function decodePolyline(str: string, precision = 6): LatLng[] {
  const factor = 10 ** precision;
  let index = 0;
  let lat = 0;
  let lon = 0;
  const out: LatLng[] = [];
  while (index < str.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    out.push({ lat: lat / factor, lon: lon / factor });
  }
  return out;
}
