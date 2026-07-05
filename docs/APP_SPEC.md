# MC GAME MAP — App Specification

## Product identity

A real-world navigation app that turns the user's surroundings into a
**voxel-style parchment adventure map**. Real streets, real GPS, real
turn-by-turn — presented as an item held by a player inside a
survival-crafting game.

Design law: **if it looks like Apple Maps / Google Maps / Waze / Material
Design / default iOS — redesign it.** Full rules live in
[`VISUAL_DESIGN_SYSTEM.md`](./VISUAL_DESIGN_SYSTEM.md).

## Platform & stack

- **React Native + Expo (SDK 57), TypeScript, expo-router**
- Rendering: `react-native-svg` (map scene, pixel icons)
- Position: `expo-location` (GPS; browser geolocation on web)
- Live data (free, keyless, swappable via `src/nav/providers.ts`):
  - Geocoding: **OSM Nominatim**
  - Routing: **OSRM public server** (driving profile, full step maneuvers)

## Screens

| Route | Screen | Description |
|---|---|---|
| `/` | Title menu | Game main menu: compass crest, gold pixel title, block buttons |
| `/search` | Search Destination | Stone search box, live geocoded results as item rows, saved-place chest shortcuts |
| `/map` | Parchment Map | The navigation surface: wooden frame, parchment, gold route, voxel player, HUD panels |
| `/saved` | Saved Places | Chest screen; each place is an item in a slot |
| `/downloads` | Download Area | Offline regions as item cards with XP progress bars (demo data) |

## Main user flow

1. Open app → pixel title/menu.
2. `START NAVIGATION` → search destination (live Nominatim results while typing).
3. Pick a place → **"Crafting route…"** XP loading while OSRM computes the route.
4. Parchment map opens in overview (whole route fitted).
5. `BEGIN QUEST` → camera follows the voxel player triangle.
   - With GPS: real position, snapped to the route.
   - Without GPS (denied/unavailable/browser): **demo drive** simulates
     driving the route so the full experience still works.
6. Turn instructions appear in a bottom pixel panel: gold arrow glyph,
   game-flavored instruction ("Turn left onto Oak Street"), live distance
   countdown, XP progress bar for the whole journey, live ETA in the top strip.
7. Going >45 m off route (3 consecutive fixes) → **"Recalculating path…"**
   overlay + automatic reroute from the current position.
8. Within 25 m of the destination → **"YOU HAVE ARRIVED!"** quest-complete panel.

## Navigation engine (`src/nav/`)

- `providers.ts` — Nominatim search, OSRM route fetch, OSRM→game
  instruction text ("Set out on your quest", "At the circle, take exit 2…").
- `geo.ts` — haversine, bearings, cumulative distances, windowed
  snap-to-polyline, HUD formatting (`850 m`, `1.2 km`, `1 h 12 min`).
- `useLiveNavigation.ts` — per-fix derivation of: snapped position, active
  step, distance-to-maneuver, remaining distance/ETA, off-route detection
  with reroute callback, arrival detection. Also `useGpsPosition` (expo-location
  watcher) and `useDemoDrive` (route simulator).

## Current milestone status

**Done (this milestone):** design system + all five screens + live search,
live routing, live GPS turn-by-turn, reroute, demo drive, docs.

**Milestone 2 (next):**
- Street-network rendering on the parchment (Overpass/vector tiles drawn
  in voxel style) so surrounding roads are visible, not just the route.
- Persist saved places (AsyncStorage) + add/edit/delete flows.
- Real offline region downloads.
- Original SFX pack wired into `src/sound/sounds.ts` (expo-audio).
- Voice guidance (pixel-styled TTS), speed/units settings.
- Optional commissioned proprietary pixel font (swap in `src/theme/typography.ts`).
- Production routing/geocoding provider with an API key + usage policies
  (OSRM demo & Nominatim are fine for development, not production traffic).

## Development

```bash
npm install
npm run web        # run in browser
npm start          # Expo dev server (scan with Expo Go / dev build)
npm run typecheck  # tsc --noEmit
```
