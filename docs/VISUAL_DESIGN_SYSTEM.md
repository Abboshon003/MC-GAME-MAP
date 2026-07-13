# TerraPath — Visual Design System

> **Product identity:** a real-world navigation app that turns the user's
> surroundings into a **chunky voxel adventure map**.
>
> **The rule:** if an element looks like Apple Maps, Google Maps, Waze,
> Material Design, or default iOS UI — **redesign it**.
>
> **The better rule:** every screen must feel like it belongs inside a
> survival-crafting game's **inventory, map, or pause menu**.

All tokens live in code at `src/theme/` — that folder is the single source
of truth; this document explains the intent behind it.

---

## 1. Typography

Pixel/block fonts only. No modern rounded fonts, no SF Pro / Material feel.

| Role | Font | Token |
|---|---|---|
| Titles, buttons, menu labels, HUD labels | **Press Start 2P** (OFL) | `fontFamilies.display` |
| Route instructions, list rows, longer text | **Pixelify Sans** (OFL) | `fontFamilies.body` |

- Both fonts are open-source (SIL OFL) with commercial permission and are
  **legally separate** from any game IP.
- Used everywhere: buttons, route instructions, distance labels, ETA, menu
  titles, map labels, loading screens.
- Style targets: blocky, pixelated, square corners, low-resolution feel,
  high readability.
- **Swap point:** if a custom proprietary pixel font is commissioned later,
  only `src/theme/typography.ts` changes.
- All text renders through `PixelText` (`src/components/PixelText.tsx`) —
  raw `<Text>` with a system font is forbidden.

## 2. UI design

Every screen is a Minecraft-style menu, built from:

- **dark stone panels** (`PixelPanel texture="stone"`)
- **brown dirt/wood panels** (`PixelPanel texture="dirt"`)
- **gray beveled buttons** (`BlockButton`)
- pixel borders, square corners (`borders.radius = 0` always)
- hard offset shadows (`hardShadow`, zero blur)
- **no blur, no glassmorphism, no rounded modern cards, no gradients**

Buttons read as in-game blocks:

```
[  START NAVIGATION  ]
[  DOWNLOAD AREA     ]
[  SAVED PLACES      ]
```

**Pressed state** (implemented in `BlockButton`):
- button shifts down 2 px
- border darkens, bevel inverts
- text nudges down 1 px

## 3. Map presentation

The map is an **isometric 3D voxel world** built from live OpenStreetMap
data — never a Google-Maps pane. The camera is a fixed tilted orthographic
view (45° rotated, like holding a diorama); real streets, water, parks and
buildings become textured blocks: houses get stepped gable roofs, chimneys
and hard sun shadows; parks get voxel trees and flowers; junctions get
crosswalk stripes. The rich 2D aerial SVG renderer (pitched gable/hip
rooftops seen from above) is kept as an automatic fallback when GL is
unavailable.

**Interaction follows Google/Apple Maps UX (with Minecraft UI):** drag to pan
anywhere, pinch (or the +/− block buttons) to zoom, and a compass recenter
block appears whenever the camera leaves follow mode. World data loads around
wherever the camera looks. During a gesture the map moves as a frozen image
and the camera commits on release, so panning stays smooth.

Visual layers (bottom → top):

```
grass base
└─ terrain blocks (roads=stone, water=blue, park/forest=green, building=dark stone, sand)
   └─ route overlay (gold pixel trail + brown outline)
      └─ destination banner + voxel player triangle
         └─ business (POI) markers
            └─ day/night tint
               └─ pixel HUD panels (search, menu, route)
```

Implementation: `src/map/worldData.ts` (Overpass fetch) →
`src/map/voxelize.ts` (rasterize features into a block grid) →
`src/map/ParchmentMap.tsx` (SVG scene). Web-mercator camera + block math in
`src/map/projection.ts`; `useWorldTiles.ts` handles fetch/caching and falls
back to procedural terrain if the network is unavailable.

## 4. Navigation marker

The modern GPS dot is replaced with an **original voxel player triangle** —
gold body, dark-brown outline, hard offset shadow — rotating with the
player's heading. A pixel compass rose sits in the map corner.
No game character icons are copied.

## 5. Route line

**A gold/yellow pixel route line with a darker brown outline** (chosen
style). Drawn as two polylines: a 12 px `routeOutline` brown underlay and a
6 px `routeGold` dashed trail on top — butt caps, miter joins, no rounding.
It reads clearly but still feels drawn onto the map by hand.

## 6. Pins and destination markers

Original game-style pixel icons (`src/icons/icons.tsx`), never iOS/Google
pins, never copied game items:

| Meaning | Marker |
|---|---|
| destination | small **red banner** on a pole |
| home | tiny **house block** |
| work | gray **anvil** |
| food | pixel **bread** |
| gas | pixel **bucket** |
| parking | small **signpost** |
| favorite | gold **star** |

All are 12×12 pixel grids rendered via `PixelIcon` / `PixelGlyph`.

**Business markers (POIs):** live businesses around the user each get an
original 12×12 pixel icon (`src/icons/poiIcons.tsx`) — restaurant, cafe, fast
food, bar, grocery, shop, bank, pharmacy, hospital, school, hotel, fuel,
worship, gym, park. Tapping one opens a callout to route there.

**Units:** distances are shown in **US customary** (feet / miles) by default.

**Day / night:** a translucent tint over the whole map shifts with the user's
local clock — bright day, amber dawn/dusk, deep torch-blue night
(`src/map/daylight.ts`).

## 7. Menus

Screens feel like inventory/menu screens:

- **Search Destination** — stone-textured search box with an inset bevel
  and a blinking blocky cursor; results are blocky item rows.
- **Saved Places** — a chest-like list; each place sits in an **item slot**
  (`ItemSlot`, inset bevel like a chest square), header reads `PLACE CHEST (5/27)`.
- **Offline Downloads** — map regions as item cards with chest icons and
  XP-style progress bars.

## 8. Loading states

No spinners, ever. Flavor text cycles over a green XP bar
(`LoadingScreen`, `XPProgressBar`):

```
"Generating chunks…"   "Loading terrain…"
"Crafting route…"      "Exploring nearby area…"
```

The bar is bright XP green with pixel segments and square edges. Rerouting
shows **"Recalculating path…"** in a stone panel.

## 9. Sound design (planned)

Original sounds only — **no Minecraft audio**. The API already exists
(`src/sound/sounds.ts`) and screens call it at the right moments:

| Event | Sound direction |
|---|---|
| map opens | soft paper unfold |
| button press | stone click |
| list row tap | wood tap |
| route drawn | map scribble |
| arrival | level-up style chime |
| reroute | low soft thud |

## 10. Color palette

Muted block-game palette (`src/theme/colors.ts`). No neon, no gradients,
no glossy effects.

| Token | Hex | Use |
|---|---|---|
| `parchment` | `#E8D9A0` | map paper |
| `dirt` | `#7A5230` | wood/dirt panels, map frame |
| `grass` | `#5FA346` | terrain |
| `forest` | `#2E4D28` | terrain |
| `water` | `#4A7BA6` | terrain |
| `stone` | `#8A8A8A` | anvil, buckets, slots |
| `sand` | `#D8C38A` | terrain |
| `routeGold` | `#F2C438` | route, primary buttons, accents |
| `routeOutline` | `#7A4E1E` | route underlay |
| `dangerRed` | `#B4322A` | banners, END button |
| `charcoal` | `#2B2B2B` | app background |
| `xpGreen` | `#7FCC19` | progress bars |

## 11. Main user flow

```
Open app → live voxel map (MapHub, src/screens/MapHub.tsx)
↓ search (top bar, proximity-sorted) OR tap a business marker
↓ route preview: distance/ETA + Drive/Walk/Bike toggle
↓ BEGIN QUEST → camera follows the voxel player (GPS or demo drive)
↓ turn instructions in pixel panels (arrow glyph + feet/miles)
↓ off-route → "Recalculating path…" (live reroute)
↓ arrival → "YOU HAVE ARRIVED!" quest-complete panel
```

The corner **MENU** button opens Saved Places & the Download Area.

## 12. Legal originality checklist

- ✅ Fonts: OFL, commercially licensed, not game fonts.
- ✅ Icons: original 12×12 pixel art authored for this app.
- ✅ Marker: original voxel triangle, no game characters.
- ✅ Sounds: to be produced originally; none ripped from any game.
- ✅ Naming/copy: game-flavored but generic ("quest", "chest", "chunks") —
  no trademarked names or assets.
