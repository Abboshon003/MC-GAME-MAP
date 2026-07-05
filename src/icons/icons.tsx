import React from 'react';
import { colors } from '@/theme';
import { PixelIcon } from './PixelIcon';

/**
 * Original pixel-art icon set (12x12 grids). Category markers for pins,
 * saved places and search results. Legally original — designed for this
 * app, not copied from any game.
 */

interface IconProps {
  size?: number;
}

/** Home: tiny house block — brown walls, dark roof, gold window */
export function HomeBlockIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{
        r: colors.dirtDark,
        w: colors.dirt,
        d: '#3E2A15',
        g: colors.routeGold,
        s: colors.stoneDark,
      }}
      grid={[
        '.....rr.....',
        '....rrrr....',
        '...rrrrrr...',
        '..rrrrrrrr..',
        '.rrrrrrrrrr.',
        'rrrrrrrrrrrr',
        '.wwwwwwwwww.',
        '.wwgg..dd.w.',
        '.wwgg..dd.w.',
        '.wwww..dd.w.',
        '.wwww..dd.w.',
        '.ssssssssss.',
      ]}
    />
  );
}

/** Work: gray anvil */
export function AnvilToolIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ a: colors.stone, d: colors.stoneDark, b: '#2F2F2F' }}
      grid={[
        '............',
        '.aaaaaaaaaa.',
        '.aaaaaaaaaa.',
        '.dddaaaaddd.',
        '....aaaa....',
        '....aaaa....',
        '....aaaa....',
        '...aaaaaa...',
        '..aaaaaaaa..',
        '.bbbbbbbbbb.',
        '.bbbbbbbbbb.',
        '............',
      ]}
    />
  );
}

/** Food: pixel bread loaf */
export function BreadIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ b: '#C89B52', d: '#96703A', l: '#E3C078' }}
      grid={[
        '............',
        '............',
        '...bbbbbb...',
        '..blllllbb..',
        '.bllbbbllbb.',
        '.blbbbbbbbb.',
        '.bbbbbbbbdd.',
        '.bbbbbbbddd.',
        '..bbbbbddd..',
        '...dddddd...',
        '............',
        '............',
      ]}
    />
  );
}

/** Gas: pixel bucket with fuel */
export function BucketIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ h: colors.stoneDark, b: colors.stone, d: '#4E4E4E', f: '#3B3B3B' }}
      grid={[
        '............',
        '...h....h...',
        '..h......h..',
        '..h......h..',
        '.bbbbbbbbbb.',
        '.bffffffffb.',
        '.bffffffffb.',
        '..bffffffb..',
        '..bbbbbbbb..',
        '...bbbbbb...',
        '...dddddd...',
        '............',
      ]}
    />
  );
}

/** Parking: small wooden signpost with a P-like plank */
export function SignpostIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ w: colors.dirt, d: colors.dirtDark, l: colors.dirtLight, t: colors.textLight }}
      grid={[
        '............',
        '.wwwwwwwwww.',
        '.wttttw..dw.',
        '.wt...tw.dw.',
        '.wttttw..dw.',
        '.wt......dw.',
        '.wt......dw.',
        '.wwwwwwwwww.',
        '.....dd.....',
        '.....dd.....',
        '.....dd.....',
        '....dddd....',
      ]}
    />
  );
}

/** Destination: small red banner on a pole */
export function RedBannerIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ p: colors.dirtDark, r: colors.dangerRed, k: colors.bannerRed, g: colors.routeGold }}
      grid={[
        '.pp.........',
        '.pprrrrrrr..',
        '.pprkkkkkr..',
        '.pprkgggkr..',
        '.pprkgggkr..',
        '.pprkkkkkr..',
        '.pprrrrrrr..',
        '.pprrr.rrr..',
        '.pprr...rr..',
        '.pp.........',
        '.pp.........',
        '.pp.........',
      ]}
    />
  );
}

/** Compass: parchment compass with red needle */
export function CompassIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{
        o: colors.parchmentInk,
        f: colors.parchmentDeep,
        n: colors.dangerRed,
        s: colors.textLight,
        c: '#3A3A3A',
      }}
      grid={[
        '....oooo....',
        '..ooffffoo..',
        '.offffffffo.',
        '.offffnfffo.',
        'offfffnffffo',
        'offffnnnfffo',
        'offffnnnfffo',
        'offffsnffffo',
        '.offsfffffo.',
        '.offffffffo.',
        '..ooffffoo..',
        '....oooo....',
      ]}
    />
  );
}

/** Star: gold favorite/saved marker */
export function GoldStarIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ g: colors.routeGold, d: colors.routeGoldDark }}
      grid={[
        '.....gg.....',
        '.....gg.....',
        '....gggg....',
        'gggggggggggg',
        '.gggggggggg.',
        '..gggggggg..',
        '...gggggg...',
        '...gggggg...',
        '..ggg..ggg..',
        '..gg....gg..',
        '.dd......dd.',
        '............',
      ]}
    />
  );
}

/** Chest: for the downloads / storage screens */
export function ChestIcon({ size = 32 }: IconProps) {
  return (
    <PixelIcon
      size={size}
      palette={{ w: colors.dirt, d: colors.dirtDark, l: colors.dirtLight, m: colors.stone }}
      grid={[
        '............',
        '.dddddddddd.',
        '.dwwwwwwwwd.',
        '.dwwwwwwwwd.',
        '.dddddddddd.',
        '.dwwwdmdwwd.',
        '.dwwwdmdwwd.',
        '.dwwwwwwwwd.',
        '.dwwwwwwwwd.',
        '.dwwwwwwwwd.',
        '.dddddddddd.',
        '............',
      ]}
    />
  );
}

export type PlaceCategory = 'home' | 'work' | 'food' | 'gas' | 'parking' | 'destination' | 'star';

export function CategoryIcon({ category, size = 32 }: { category: PlaceCategory; size?: number }) {
  switch (category) {
    case 'home':
      return <HomeBlockIcon size={size} />;
    case 'work':
      return <AnvilToolIcon size={size} />;
    case 'food':
      return <BreadIcon size={size} />;
    case 'gas':
      return <BucketIcon size={size} />;
    case 'parking':
      return <SignpostIcon size={size} />;
    case 'destination':
      return <RedBannerIcon size={size} />;
    case 'star':
      return <GoldStarIcon size={size} />;
  }
}
