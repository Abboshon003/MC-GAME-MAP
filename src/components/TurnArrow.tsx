import React from 'react';
import { colors } from '@/theme';
import { PixelIcon } from '@/icons/PixelIcon';
import type { RouteStep } from '@/nav/types';

/** Pixel arrow glyphs for each maneuver kind (10x10 grids). */
const GRIDS: Record<string, string[]> = {
  straight: [
    '....aa....',
    '...aaaa...',
    '..aaaaaa..',
    '.aaaaaaaa.',
    '....aa....',
    '....aa....',
    '....aa....',
    '....aa....',
    '....aa....',
    '....aa....',
  ],
  left: [
    '..........',
    '...a......',
    '..aa......',
    '.aaaaaaaa.',
    'aaaaaaaaa.',
    '.aaaaaaaa.',
    '..aa...aa.',
    '...a...aa.',
    '.......aa.',
    '.......aa.',
  ],
  right: [
    '..........',
    '......a...',
    '......aa..',
    '.aaaaaaaa.',
    '.aaaaaaaaa',
    '.aaaaaaaa.',
    '.aa...aa..',
    '.aa...a...',
    '.aa.......',
    '.aa.......',
  ],
  'slight-left': [
    '..aaaa....',
    '..aaa.....',
    '..aaaa....',
    '..a.aaa...',
    '.....aaa..',
    '......aa..',
    '......aa..',
    '.......aa.',
    '.......aa.',
    '.......aa.',
  ],
  'slight-right': [
    '....aaaa..',
    '.....aaa..',
    '....aaaa..',
    '...aaa.a..',
    '..aaa.....',
    '..aa......',
    '..aa......',
    '.aa.......',
    '.aa.......',
    '.aa.......',
  ],
  uturn: [
    '..........',
    '..aaaaaa..',
    '.aaaaaaaa.',
    '.aa....aa.',
    '.aa....aa.',
    '.aa....aa.',
    'aaaa...aa.',
    '.aa....aa.',
    '..a....aa.',
    '.......aa.',
  ],
  arrive: [
    '....aa....',
    '...aaaa...',
    '..aaaaaa..',
    '.aaaaaaaa.',
    'aaaaaaaaaa',
    '....aa....',
    '....aa....',
    '....aa....',
    '..aaaaaa..',
    '..aaaaaa..',
  ],
  roundabout: [
    '...aaaa...',
    '..aaaaaa..',
    '.aa....aa.',
    '.aa....aa.',
    '.aa....aa.',
    '.aa....aa.',
    '.aaa..aaa.',
    '..a.aa.a..',
    '....aa....',
    '....aa....',
  ],
};

const ALIASES: Partial<Record<RouteStep['kind'], string>> = {
  depart: 'straight',
  merge: 'slight-right',
  fork: 'slight-right',
  'sharp-left': 'left',
  'sharp-right': 'right',
};

export function TurnArrow({ kind, size = 44 }: { kind: RouteStep['kind']; size?: number }) {
  const grid = GRIDS[kind] ?? GRIDS[ALIASES[kind] ?? 'straight'];
  return <PixelIcon size={size} grid={grid} palette={{ a: colors.routeGold }} />;
}
