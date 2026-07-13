# TerraPath — App Specification

## Product identity

A real-world navigation app that turns the user's surroundings into a
**chunky voxel adventure map**. Real streets, real GPS, real turn-by-turn —
rendered as a top-down survival-crafting world made of terrain blocks.

Design law: **if it looks like Apple Maps / Google Maps / Waze / Material
Design / default iOS — redesign it.** Full rules live in
[`VISUAL_DESIGN_SYSTEM.md`](./VISUAL_DESIGN_SYSTEM.md).

## Platform & stack

- **React Native + Expo (SDK 57), TypeScript, expo-router**
- Rendering: **isometric 3D voxel engine** on `expo-gl` + `three` (`src/map3d/`),
  with the `react-native-svg` top-down map (`src/map/ParchmentMap.tsx`) as an
  automatic fallback when GL is unavailable; pixel icons via `react-native-svg`
- Position: `expo-location` (GPS; browser geolocation on web)
- Units: **US customary** (feet / miles) by default — `formatDistance` in
  `src/nav/geo.ts`.
- Live data (free, keyless, each behind a provider module):
  - World features + businesses: **OSM Overpass API** (`src/map/worldData.ts`)
  - Geocoding: **Nominatim**, proximity-biased & distance-sorted (`src/nav/providers.ts`)
  - Routing: **OSRM** (driving) + **Valhalla** (walk / bike / driving fallback)

## Screens / routes

| Route | Screen | Description |
|---|---|---|
| `/` | **MapHub** (`src/screens/MapHub.tsx`) | The whole app: live voxel world, player, business markers, top search bar, corner menu, and the route HUD. Opens here directly. |
| `/saved` | Saved Places | Chest screen; each place is an item in a slot. Reached from the corner menu. |
| `/downloads` | Download Area | Offline regions as item cards with XP progress bars. Reached from the corner menu. |

## The 3D voxel map (`src/map3d/`)

The primary renderer: a fixed-angle isometric three.js scene fed by the same
OSM pipeline below. `pixelTextures.ts` builds nearest-filter DataTextures
(no canvas — native + web identical); `buildScene.ts` constructs the ground
plane, instanced terrain blocks, stepped-gable/flat-roof buildings with hard
sun shadows, voxel trees, park flowers, water shorelines, crosswalk stripes
at road junctions, the gold block route, player arrow and destination banner;
`VoxelWorld3D.tsx` drives the camera (browse / fit-route / follow), applies
the day/dusk/night light grade, and exposes a world→screen projector used by
the RN overlay (category POI pins with real-name chips, street labels).

## The 2D voxel ground pipeline (shared data + SVG fallback)

- `src/map/worldData.ts` fetches roads, water, parks/landuse, buildings and
  business POIs for a bbox around the user (Overpass).
- `src/map/voxelize.ts` rasterizes those features into a chunky block grid
  (`Map<"bx,by", TerrainType>`) — scanline-filled polygons + stamped road
  lines. Only non-grass blocks are stored; the renderer paints a grass base.
- `src/map/useWorldTiles.ts` fetches on first fix, refetches when the player
  leaves the loaded area (~400 m margin), caches the last grid, and degrades
  to procedural terrain if Overpass fails (map never blanks).
- `src/map/ParchmentMap.tsx` draws the grass base, terrain blocks, the gold
  route (brown outline), the voxel player triangle, the destination banner,
  and a **day/night tint** (`src/map/daylight.ts`).
- **Richer visual layers** (`src/map/textures.tsx`, `src/map/layers.tsx`):
  pixel textures (grass tufts, asphalt, water waves, cobble/plank/brick roofs)
  via SVG `<Pattern>`; **pseudo-3D buildings** extruded from footprints
  (shadow + walls + textured roof); **tree** sprites scattered on greens;
  dashed **lane markings** on major roads; rotated **street-name labels**.
  A `detail` flag renders full richness while browsing and a flat "lite"
  style while navigating (keeps the frame rate up).
- Block math (`BLOCK_ZOOM`, `projectBlock`, `blockScreenSize`) lives in
  `src/map/projection.ts`.

## Businesses (POIs)

- `src/nav/poi.ts` classifies OSM tags into categories (restaurant, cafe,
  grocery, bank, pharmacy, hotel, fuel, …).
- `src/icons/poiIcons.tsx` renders each with an original 12×12 pixel icon.
- Nearest ~40 are shown as tappable markers while browsing; tapping opens a
  callout (`src/components/PoiCallout.tsx`) with distance + **NAVIGATE**.

## Main user flow

1. App opens straight to the **live voxel map** centered on GPS, with nearby
   businesses shown as pixel markers.
2. **Search** (top bar) → proximity-sorted results (nearest first), or **tap a
   business** → callout → NAVIGATE.
3. Route preview: destination, distance/ETA (miles), and a **Drive/Walk/Bike**
   toggle. Changing mode re-crafts the route.
4. **BEGIN QUEST** → the camera follows the voxel player triangle (real GPS, or
   demo drive if GPS is unavailable).
5. Turn-by-turn in a bottom pixel panel: gold arrow, instruction, live distance
   (feet/miles), journey XP bar. Off-route → **"Recalculating path…"** + reroute.
6. Within ~80 ft of the destination → **YOU HAVE ARRIVED!**

## Navigation engine (`src/nav/`)

- `providers.ts` — Nominatim search (proximity sort), OSRM driving route,
  shared game-flavored instruction text; delegates walk/bike to Valhalla.
- `valhalla.ts` — Valhalla provider (auto/pedestrian/bicycle) + polyline6 decode.
- `geo.ts` — haversine, bearings, snap-to-route, **imperial** HUD formatting.
- `useLiveNavigation.ts` — per-fix snapped position, active step,
  distance-to-turn, ETA, off-route/reroute, arrival; plus `useGpsPosition`
  and `useDemoDrive`.

## Milestone status

**Done (M2):** voxel world map, map-first UX, proximity search, business POIs +
tap-to-route, walk/drive/bike, day/night, US units, TerraPath rename — on top of
M1's design system + live turn-by-turn.

**Roadmap:** placeable map banners, XP/distance leveling,
biome theming, persisted saved places + real offline downloads (AsyncStorage),
original SFX pack, voice guidance, vector-tile basemap (perf upgrade over
Overpass), production routing/geocoding keys.

## Development

```bash
npm install
npm run web        # run in browser
npm start          # Expo dev server (Expo Go / dev build)
npm run typecheck  # tsc --noEmit
```
