import { classifyPoi, type OsmTags, type Poi } from '@/nav/poi';
import type { LatLng } from '@/nav/types';

/**
 * Live world features around the user, from the OpenStreetMap Overpass API
 * (free, keyless). Returns polygons (water / greens / buildings), road lines,
 * and business POIs for a bbox. Kept behind this module so a vector-tile
 * source can replace it later without touching the renderer.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export type PolygonKind = 'water' | 'park' | 'forest' | 'building' | 'sand';
export type RoadClass = 'major' | 'minor' | 'path';

export interface WorldPolygon {
  kind: PolygonKind;
  ring: LatLng[];
}
export interface WorldRoad {
  klass: RoadClass;
  pts: LatLng[];
  name?: string;
}
export interface WorldData {
  polygons: WorldPolygon[];
  roads: WorldRoad[];
  pois: Poi[];
  center: LatLng;
  radiusMeters: number;
}

/** south,west,north,east bbox around a center point. */
function bbox(center: LatLng, radiusMeters: number): string {
  const dLat = radiusMeters / 111_320;
  const dLon = radiusMeters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return `${center.lat - dLat},${center.lon - dLon},${center.lat + dLat},${center.lon + dLon}`;
}

function roadClass(highway: string): RoadClass {
  if (/motorway|trunk|primary|secondary/.test(highway)) return 'major';
  if (/tertiary|residential|unclassified|living_street|service/.test(highway)) return 'minor';
  return 'path';
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: OsmTags;
  geometry?: Array<{ lat: number; lon: number }>;
}

/** Fetch and parse world features for the area around `center`. */
export async function fetchWorld(
  center: LatLng,
  radiusMeters = 700,
  signal?: AbortSignal,
): Promise<WorldData> {
  const box = bbox(center, radiusMeters);
  // Tag lists are deliberately narrow: pulling *every* amenity/shop node in a
  // dense city is what made first load take minutes. Fetch only what we draw.
  const AMENITY =
    'restaurant|cafe|fast_food|bar|pub|bank|atm|pharmacy|hospital|clinic|doctors|fuel|charging_station|school|university|college|library|place_of_worship|cinema|theatre|marketplace|parking';
  const SHOP =
    'supermarket|convenience|grocery|greengrocer|bakery|mall|department_store|clothes|hardware|electronics|books|florist|butcher|coffee|deli';
  const query = `[out:json][timeout:20];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian|footway"](${box});
  way["natural"="water"](${box});
  way["landuse"~"reservoir|basin"](${box});
  way["landuse"~"forest|grass|meadow|recreation_ground|village_green"](${box});
  way["leisure"~"park|garden|pitch|golf_course"](${box});
  way["natural"="sand"](${box});
  way["building"](${box});
  node["amenity"~"${AMENITY}"](${box});
  node["shop"~"${SHOP}"](${box});
  node["tourism"~"hotel|motel|hostel|guest_house|attraction|museum"](${box});
);
out body geom 1500;`;

  const data = await postOverpass(query, signal);
  const polygons: WorldPolygon[] = [];
  const roads: WorldRoad[] = [];
  const pois: Poi[] = [];

  for (const el of data.elements as OverpassElement[]) {
    const tags = el.tags ?? {};
    if (el.type === 'way' && el.geometry && el.geometry.length > 1) {
      const pts: LatLng[] = el.geometry.map((g) => ({ lat: g.lat, lon: g.lon }));
      if (tags.highway) {
        roads.push({ klass: roadClass(tags.highway), pts, name: tags.name });
      } else if (tags.natural === 'water' || tags.landuse === 'reservoir' || tags.landuse === 'basin') {
        polygons.push({ kind: 'water', ring: pts });
      } else if (tags.landuse === 'forest' || tags.natural === 'wood') {
        polygons.push({ kind: 'forest', ring: pts });
      } else if (tags.natural === 'sand' || tags.natural === 'beach') {
        polygons.push({ kind: 'sand', ring: pts });
      } else if (
        tags.leisure === 'park' ||
        tags.leisure === 'garden' ||
        tags.leisure === 'pitch' ||
        tags.leisure === 'golf_course' ||
        tags.landuse === 'grass' ||
        tags.landuse === 'meadow' ||
        tags.landuse === 'recreation_ground' ||
        tags.landuse === 'village_green'
      ) {
        polygons.push({ kind: 'park', ring: pts });
      } else if (tags.building) {
        polygons.push({ kind: 'building', ring: pts });
      }
    } else if (el.type === 'node' && el.lat != null && el.lon != null) {
      const category = classifyPoi(tags);
      if (category && tags.name) {
        pois.push({
          id: `osm-${el.id}`,
          name: tags.name,
          category,
          location: { lat: el.lat, lon: el.lon },
        });
      }
    }
  }

  return { polygons, roads, pois, center, radiusMeters };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/** Per-mirror timeout: a stuck server should fail fast so we try the next. */
const MIRROR_TIMEOUT_MS = 15000;

/** POST the query, trying mirrors in turn with a hard per-mirror timeout. */
async function postOverpass(query: string, signal?: AbortSignal): Promise<OverpassResponse> {
  let lastErr: unknown;
  for (const url of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctrl.abort(), MIRROR_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return (await res.json()) as OverpassResponse;
    } catch (e) {
      lastErr = e;
      if (signal?.aborted) throw e; // caller cancelled (moved/unmounted)
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Overpass unreachable');
}
