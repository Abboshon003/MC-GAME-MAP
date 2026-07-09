import React from 'react';
import { colors } from '@/theme';
import { PixelIcon } from './PixelIcon';
import type { PoiCategory } from '@/nav/poi';

/**
 * Original 12×12 pixel-art icons for business/POI categories. Same grid
 * renderer as the core icon set — nothing copied from any game.
 */

const P = {
  red: colors.dangerRed,
  gold: colors.routeGold,
  goldD: colors.routeGoldDark,
  stone: colors.stone,
  stoneD: colors.stoneDark,
  wood: colors.dirt,
  woodD: colors.dirtDark,
  green: colors.grass,
  greenD: colors.forest,
  water: colors.water,
  white: colors.textLight,
  cream: '#E3C078',
  brown: '#96703A',
};

const GRIDS: Record<PoiCategory, { grid: string[]; palette: Record<string, string> }> = {
  // Fork + knife on a plate
  restaurant: {
    palette: { s: P.stone, f: P.white, d: P.stoneD },
    grid: [
      '.f.f..f.....',
      '.f.f..f.....',
      '.f.f..f.....',
      '.fff..f.....',
      '..f...f.....',
      '..f...f.....',
      '............',
      '..dddddd....',
      '.dssssssd...',
      '.dssssssd...',
      '..dddddd....',
      '............',
    ],
  },
  // Coffee cup
  cafe: {
    palette: { c: P.white, d: P.stoneD, b: P.brown, s: P.stone },
    grid: [
      '............',
      '...b........',
      '..b.b.......',
      '...b........',
      '.cccccccc...',
      '.cbbbbbcccc.',
      '.cbbbbbc..c.',
      '.cbbbbbcccc.',
      '.cccccccc...',
      '.dddddddd...',
      '..dddddd....',
      '............',
    ],
  },
  // Burger
  fastfood: {
    palette: { b: P.cream, m: P.woodD, g: P.green, c: P.brown },
    grid: [
      '............',
      '..bbbbbbbb..',
      '.bbbbbbbbbb.',
      '.bccccccccb.',
      '.gggggggggg.',
      '.mmmmmmmmmm.',
      '.cccccccccc.',
      '.bbbbbbbbbb.',
      '..bbbbbbbb..',
      '............',
      '............',
      '............',
    ],
  },
  // Beer mug
  bar: {
    palette: { m: P.gold, f: P.white, g: P.stone, d: P.goldD },
    grid: [
      '............',
      '.ffff.......',
      'ffffff......',
      '.gggggg.gg..',
      '.gmmmmg.gg..',
      '.gmmmmg.gg..',
      '.gmmmmg.gg..',
      '.gmmmmg.gg..',
      '.gddddg.....',
      '.gggggg.....',
      '............',
      '............',
    ],
  },
  // Shopping basket
  grocery: {
    palette: { w: P.woodD, a: P.red, g: P.green, c: P.cream },
    grid: [
      '............',
      '...a...g....',
      '..aa..gg....',
      '.wwwwwwwww..',
      '.wcwcwcwcw..',
      '.wwwwwwwww..',
      '.wcwcwcwcw..',
      '.wwwwwwwww..',
      '..wwwwwww...',
      '............',
      '............',
      '............',
    ],
  },
  // Storefront with awning
  shop: {
    palette: { w: P.woodD, a: P.red, c: P.cream, d: P.stoneD, g: P.water },
    grid: [
      '.dddddddddd.',
      '.acacacacac.',
      '.acacacacac.',
      '.dddddddddd.',
      '.wggggggggw.',
      '.wggggggggw.',
      '.wggggggwgw.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '............',
      '............',
    ],
  },
  // Bank ($ coin)
  bank: {
    palette: { g: P.gold, d: P.goldD, k: P.woodD },
    grid: [
      '...dddddd...',
      '..dggggggd..',
      '.dgg.kk.ggd.',
      '.dg.kkkk.gd.',
      '.dg.kk...gd.',
      '.dg..kk..gd.',
      '.dg...kk.gd.',
      '.dg.kkkk.gd.',
      '.dgg.kk.ggd.',
      '..dggggggd..',
      '...dddddd...',
      '............',
    ],
  },
  // Pharmacy (green cross)
  pharmacy: {
    palette: { g: P.green, d: P.greenD, w: P.white },
    grid: [
      '............',
      '...gggggg...',
      '..gwwwwwwg..',
      '..gwwggwwg..',
      '..gwggggwg..',
      '..gwggggwg..',
      '..gwwggwwg..',
      '..gwwwwwwg..',
      '...gggggg...',
      '............',
      '............',
      '............',
    ],
  },
  // Hospital (red cross)
  hospital: {
    palette: { r: P.red, w: P.white, d: P.woodD },
    grid: [
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwrrwwww.',
      '.wwwwrrwwww.',
      '.wwrrrrrrww.',
      '.wwrrrrrrww.',
      '.wwwwrrwwww.',
      '.wwwwrrwwww.',
      '.wwwwwwwwww.',
      '.dddddddddd.',
      '............',
      '............',
    ],
  },
  // School (book)
  school: {
    palette: { r: P.red, w: P.cream, d: P.woodD, g: P.gold },
    grid: [
      '............',
      '.rr......rr.',
      '.rdr....rdr.',
      '.rddr..rddr.',
      '.rdddggdddr.',
      '.rdddggdddr.',
      '.rddwggwddr.',
      '.rdwwggwwdr.',
      '.rwwwggwwwr.',
      '.rrrrrrrrrr.',
      '............',
      '............',
    ],
  },
  // Hotel (bed)
  hotel: {
    palette: { w: P.woodD, c: P.cream, b: P.water, d: P.stoneD },
    grid: [
      '............',
      '.w........w.',
      '.w..cccc..w.',
      '.w.bbbbbb.w.',
      '.wccccccccw.',
      '.wbbbbbbbbw.',
      '.wwwwwwwwww.',
      '.w........w.',
      '.w........w.',
      '............',
      '............',
      '............',
    ],
  },
  // Fuel bucket (reuse gas look)
  fuel: {
    palette: { h: P.stoneD, b: P.stone, f: P.woodD },
    grid: [
      '............',
      '...h....h...',
      '..h......h..',
      '.bbbbbbbbbb.',
      '.bffffffffb.',
      '.bffffffffb.',
      '..bffffffb..',
      '..bbbbbbbb..',
      '...bbbbbb...',
      '...ffffff...',
      '............',
      '............',
    ],
  },
  // Worship (steeple + cross)
  worship: {
    palette: { s: P.stone, d: P.stoneD, g: P.gold, w: P.white },
    grid: [
      '.....g......',
      '....ggg.....',
      '.....g......',
      '....sss.....',
      '...sssss....',
      '..sssssss...',
      '.sssssssss..',
      '.sdsdsdsds..',
      '.sdswwsds...',
      '.sdswwsds...',
      '.sssssssss..',
      '............',
    ],
  },
  // Gym (dumbbell)
  gym: {
    palette: { s: P.stoneD, m: P.stone },
    grid: [
      '............',
      '............',
      '.ss......ss.',
      '.ss......ss.',
      '.ssmmmmmmss.',
      '.ssmmmmmmss.',
      '.ss......ss.',
      '.ss......ss.',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  // Park (tree)
  park: {
    palette: { g: P.green, d: P.greenD, w: P.woodD },
    grid: [
      '....gg......',
      '...gggg.....',
      '..gggggg....',
      '.gggggggg...',
      '.gdgggggg...',
      '.gggggggg...',
      '..gggggg....',
      '...gwwg.....',
      '....ww......',
      '....ww......',
      '...wwww.....',
      '............',
    ],
  },
  // Default marker (banner dot)
  default: {
    palette: { r: P.red, k: P.woodD, w: P.white },
    grid: [
      '...kkkk.....',
      '..kwwwwk....',
      '.kwrrrrwk...',
      '.kwrrrrwk...',
      '.kwrrrrwk...',
      '..kwwwwk....',
      '...kkkk.....',
      '....kk......',
      '....kk......',
      '....kk......',
      '............',
      '............',
    ],
  },
};

export function PoiIcon({ category, size = 26 }: { category: PoiCategory; size?: number }) {
  const g = GRIDS[category] ?? GRIDS.default;
  return <PixelIcon size={size} grid={g.grid} palette={g.palette} />;
}
