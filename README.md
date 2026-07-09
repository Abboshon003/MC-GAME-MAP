# TerraPath

A real-world navigation app that turns your surroundings into a
**chunky voxel adventure map** — real streets, real GPS, real turn-by-turn,
rendered as a top-down survival-crafting world.

![status](https://img.shields.io/badge/milestone-2-blue) ![stack](https://img.shields.io/badge/expo-SDK%2057-black)

## Features

- 🧱 **Voxel world map** — real roads, water, parks and buildings around you,
  drawn as chunky terrain blocks (live OpenStreetMap data), not a Google-Maps pane
- 🗺️ **Map-first** — opens straight to the live world with a search bar on top
  and a corner menu; no landing screen
- 🧭 **Live turn-by-turn** — real routes with game-flavored instructions, live
  distance countdown, ETA, arrival, and *"Recalculating path…"* rerouting
- 🚶 **Walk / Drive / Bike** — multimodal routing (OSRM + Valhalla)
- 🔎 **Proximity search** — results ordered closest→farthest from you
- 🏪 **Nearby businesses** — shops/restaurants/etc. as original pixel icons;
  **tap one to route** to it
- 🌗 **Day / night** — the map's tint shifts with your local time
- 📏 **US units** — feet & miles by default
- 📍 **Voxel player marker** — an original gold triangle that follows your GPS heading
- 🚗 **Demo drive** — no GPS? The app simulates the drive so the flow works anywhere
- 🎨 **Full pixel design system** — block buttons, stone panels, item slots,
  XP bars, original pixel icons and OFL pixel fonts

## Run it

```bash
npm install
npm run web        # in the browser
npm start          # Expo dev server for iOS/Android
npm run typecheck
```

## Build an APK / IPA

The repo is pre-configured for [EAS Build](https://docs.expo.dev/build/introduction/)
(`eas.json`, app identifiers, location permissions):

```bash
npm install -g eas-cli
eas login

eas build -p android --profile preview     # installable .apk
eas build -p android --profile production  # .aab for the Play Store
eas build -p ios --profile production      # .ipa (needs an Apple Developer account)
```

Local alternative: `npx expo prebuild`, then `cd android && ./gradlew assembleRelease`
for an APK, or open `ios/` in Xcode (Mac only) and Archive for an IPA.

## Docs

- [App specification](docs/APP_SPEC.md)
- [Visual design system](docs/VISUAL_DESIGN_SYSTEM.md) — the 12 design
  laws every screen follows

## Legal note

All fonts are SIL-OFL licensed, all pixel art and sounds are original.
Nothing is copied from any game.
