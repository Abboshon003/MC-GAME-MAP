import { cumulativeDistances, haversineMeters, offsetOfProjection, projectOntoRoute } from './geo';
import type { LatLng, Place, Route, RouteProfile, RouteStep } from './types';
import { fetchValhallaRoute } from './valhalla';

/**
 * Live data providers — free, no API keys:
 *   - Geocoding: OpenStreetMap Nominatim (proximity-biased, distance-sorted)
 *   - Routing:   OSRM (driving) + Valhalla (walk / bike / driving fallback)
 *
 * All sit behind these functions so a commercial provider (Mapbox / Google /
 * OpenRouteService) can be swapped in later without touching any screen code.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';

/**
 * Search real-world places by free text. When the user's location is known,
 * results are biased toward it and **sorted closest→farthest**, so someone in
 * New York sees New York (then New Jersey, then farther) — never Europe first.
 */
export async function geocodeSearch(query: string, near?: LatLng): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '15',
    addressdetails: '1',
  });
  if (near) {
    // Bias (not restrict) results toward the user; distance sort does the rest.
    const d = 0.6;
    params.set('viewbox', `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
  }
  const res = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const rows = (await res.json()) as NominatimRow[];
  const places: Place[] = rows.map((r) => {
    const location = { lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
    return {
      id: `osm-${r.place_id}`,
      name: r.name || r.display_name.split(',')[0],
      detail: r.display_name,
      location,
      distanceMeters: near ? haversineMeters(near, location) : undefined,
    };
  });
  if (near) places.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return places.slice(0, 8);
}

interface NominatimRow {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

/**
 * Fetch a real route with turn-by-turn steps for the given travel mode.
 * Driving uses OSRM (fast, reliable) and falls back to Valhalla; walking and
 * cycling use Valhalla, which supports those profiles.
 */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  destinationName: string,
  profile: RouteProfile = 'drive',
): Promise<Route> {
  if (profile === 'drive') {
    try {
      return await fetchOsrmRoute(origin, destination, destinationName);
    } catch {
      return fetchValhallaRoute(origin, destination, destinationName, 'drive', flavorInstruction);
    }
  }
  return fetchValhallaRoute(origin, destination, destinationName, profile, flavorInstruction);
}

/** Driving route via OSRM. */
async function fetchOsrmRoute(
  origin: LatLng,
  destination: LatLng,
  destinationName: string,
): Promise<Route> {
  const coordsStr = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url =
    `${OSRM}/route/v1/driving/${coordsStr}` +
    `?overview=full&geometries=geojson&steps=true&annotations=false`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = (await res.json()) as OsrmResponse;
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No route found');
  }
  const r = data.routes[0];
  const coords: LatLng[] = r.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
  const cumulative = cumulativeDistances(coords);

  const steps: RouteStep[] = [];
  for (const leg of r.legs) {
    for (const s of leg.steps) {
      const location: LatLng = { lat: s.maneuver.location[1], lon: s.maneuver.location[0] };
      const proj = projectOntoRoute(location, coords);
      const kind = maneuverKind(s.maneuver);
      steps.push({
        instruction: flavorInstruction(kind, s.name || undefined, destinationName, s.maneuver.exit),
        kind,
        location,
        distanceMeters: s.distance,
        offsetMeters: offsetOfProjection(proj, cumulative, coords),
        roadName: s.name || undefined,
      });
    }
  }
  steps.sort((a, b) => a.offsetMeters - b.offsetMeters);

  return {
    coords,
    cumulative,
    distanceMeters: r.distance,
    durationSeconds: r.duration,
    steps,
    destinationName,
  };
}

interface OsrmResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: Array<{ steps: OsrmStep[] }>;
  }>;
}

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
    exit?: number;
  };
}

function maneuverKind(m: OsrmStep['maneuver']): RouteStep['kind'] {
  if (m.type === 'depart') return 'depart';
  if (m.type === 'arrive') return 'arrive';
  if (m.type === 'roundabout' || m.type === 'rotary') return 'roundabout';
  if (m.type === 'merge') return 'merge';
  if (m.type === 'fork') return 'fork';
  switch (m.modifier) {
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'slight left':
      return 'slight-left';
    case 'slight right':
      return 'slight-right';
    case 'sharp left':
      return 'sharp-left';
    case 'sharp right':
      return 'sharp-right';
    case 'uturn':
      return 'uturn';
    default:
      return 'straight';
  }
}

/**
 * Game-flavored instruction text keyed on a maneuver kind. Shared by both the
 * OSRM and Valhalla providers so navigation reads in one voice regardless of
 * which engine produced the route.
 */
export function flavorInstruction(
  kind: RouteStep['kind'],
  roadName: string | undefined,
  destName: string,
  exit?: number,
): string {
  const onto = roadName ? ` onto ${roadName}` : '';
  const along = roadName ? ` along ${roadName}` : '';
  switch (kind) {
    case 'depart':
      return roadName ? `Set out along ${roadName}` : 'Set out on your quest';
    case 'arrive':
      return `You have arrived at ${destName}!`;
    case 'left':
      return `Turn left${onto}`;
    case 'right':
      return `Turn right${onto}`;
    case 'slight-left':
      return `Bear left${onto}`;
    case 'slight-right':
      return `Bear right${onto}`;
    case 'sharp-left':
      return `Turn sharp left${onto}`;
    case 'sharp-right':
      return `Turn sharp right${onto}`;
    case 'uturn':
      return 'Turn back the way you came';
    case 'roundabout':
      return `At the circle, take exit ${exit ?? 1}${onto}`;
    case 'merge':
      return `Merge${onto}`;
    case 'fork':
      return `Keep on${along || ' your path'} at the fork`;
    default:
      return roadName ? `Continue${along}` : 'Continue onward';
  }
}
