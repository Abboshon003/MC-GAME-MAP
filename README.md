# MC GAME MAP

A real-world navigation app that turns your surroundings into a
**voxel-style parchment adventure map** — real streets, real GPS, real
turn-by-turn, presented like the map item of a survival-crafting game.

![status](https://img.shields.io/badge/milestone-1-blue) ![stack](https://img.shields.io/badge/expo-SDK%2057-black)

## Features

- 🗺️ **Parchment map** — the route renders on an aged paper item inside a
  wooden frame, not a Google-Maps pane
- 🧭 **Live turn-by-turn** — real routes (OSRM) with game-flavored
  instructions, live distance countdown, ETA and arrival detection
- 🔎 **Live search** — real place search (OSM Nominatim) styled as an
  inventory screen
- 📍 **Voxel player marker** — an original gold triangle that follows your
  GPS heading; going off-route triggers *"Recalculating path…"*
- 🚗 **Demo drive** — no GPS? The app simulates driving the route so the
  whole flow works anywhere (including the browser)
- 🎨 **Full pixel design system** — block buttons, stone panels, item
  slots, XP progress bars, original pixel icons and OFL pixel fonts

## Run it

```bash
npm install
npm run web        # in the browser
npm start          # Expo dev server for iOS/Android
npm run typecheck
```

## Docs

- [App specification](docs/APP_SPEC.md)
- [Visual design system](docs/VISUAL_DESIGN_SYSTEM.md) — the 12 design
  laws every screen follows

## Legal note

All fonts are SIL-OFL licensed, all pixel art and sounds are original.
Nothing is copied from any game.
