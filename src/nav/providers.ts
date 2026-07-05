import { cumulativeDistances, offsetOfProjection, projectOntoRoute } from './geo';
import type { LatLng, Place, Route, RouteStep } from './types';

/**
 * Live data providers — free, no API keys:
 *   - Geocoding: OpenStreetMap Nominatim
 *   - Routing:   OSRM public demo server (driving profile, full steps)
 *
 * Both sit behind these two functions so a commercial provider
 * (Mapbox / Google / OpenRouteService) can be swapped in later without
 * touching any screen code.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';

/** Search real-world places by free text. */
export async function geocodeSearch(query: string, near?: LatLng): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '8',
    addressdetails: '1',
  });
  if (near) {
    // Bias results toward the player's position
    const d = 0.35;
    params.set('viewbox', `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
  }
  const res = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const rows = (await res.json()) as NominatimRow[];
  return rows.map((r) => ({
    id: `osm-${r.place_id}`,
    name: r.name || r.display_name.split(',')[0],
    detail: r.display_name,
    location: { lat: parseFloat(r.lat), lon: parseFloat(r.lon) },
  }));
}

interface NominatimRow {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

/** Fetch a real driving route with turn-by-turn steps. */
export async function fetchRoute(
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
      steps.push({
        instruction: instructionText(s, destinationName),
        kind: maneuverKind(s.maneuver),
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

/** Turn OSRM maneuvers into game-flavored instructions. */
function instructionText(s: OsrmStep, destinationName: string): string {
  const road = s.name ? ` onto ${s.name}` : '';
  const m = s.maneuver;
  switch (m.type) {
    case 'depart':
      return s.name ? `Set out along ${s.name}` : 'Set out on your quest';
    case 'arrive':
      return `You have arrived at ${destinationName}!`;
    case 'roundabout':
    case 'rotary':
      return `At the circle, take exit ${m.exit ?? 1}${road}`;
    case 'merge':
      return `Merge${road}`;
    case 'fork':
      return m.modifier?.includes('left')
        ? `Keep left at the fork${road}`
        : `Keep right at the fork${road}`;
    case 'on ramp':
      return `Take the ramp${road}`;
    case 'off ramp':
      return `Take the exit${road}`;
    default:
      break;
  }
  switch (m.modifier) {
    case 'left':
      return `Turn left${road}`;
    case 'right':
      return `Turn right${road}`;
    case 'slight left':
      return `Bear left${road}`;
    case 'slight right':
      return `Bear right${road}`;
    case 'sharp left':
      return `Turn sharp left${road}`;
    case 'sharp right':
      return `Turn sharp right${road}`;
    case 'uturn':
      return 'Turn back the way you came';
    default:
      return s.name ? `Continue along ${s.name}` : 'Continue onward';
  }
}
