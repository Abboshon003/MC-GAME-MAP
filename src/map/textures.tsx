import React from 'react';
import { Defs, Pattern, Rect } from 'react-native-svg';
import type { TerrainType } from './voxelize';

/**
 * Pixel textures for the voxel map, as SVG <Pattern> tiles defined once and
 * referenced by fill="url(#id)". Gives grass tufts, asphalt speckle, water
 * waves, cobble/plank/brick roofs — the Minecraft-tile feel — without adding
 * elements per block.
 *
 * Patterns use userSpaceOnUse so the tile is a fixed screen size (uniform
 * texture) regardless of camera zoom.
 */

export const PATTERN: Record<TerrainType, string> = {
  water: 'tx-water',
  park: 'tx-park',
  forest: 'tx-forest',
  building: 'tx-roofPlanks', // buildings are drawn as 3D prisms; unused here
  road: 'tx-asphalt',
  road_major: 'tx-asphaltMajor',
  sidewalk: 'tx-sidewalk',
  path: 'tx-path',
  sand: 'tx-sand',
};

export const GRASS_PATTERN = 'tx-grass';

const ROOFS = ['tx-roofPlanks', 'tx-roofCobble', 'tx-roofBrick'] as const;
/** Pick a stable roof texture for a building from a hash value. */
export function roofPattern(hash: number): string {
  return ROOFS[hash % ROOFS.length];
}
/** Wall side color to match a roof texture. */
export function wallColor(roof: string): string {
  switch (roof) {
    case 'tx-roofCobble':
      return '#5E5E5E';
    case 'tx-roofBrick':
      return '#6E3324';
    default:
      return '#5C3E22';
  }
}

/** All map texture definitions. Render once inside the <Svg>. */
export function MapTextures() {
  return (
    <Defs>
      {/* grass */}
      <Pattern id={GRASS_PATTERN} width={10} height={10} patternUnits="userSpaceOnUse">
        <Rect width={10} height={10} fill="#5FA346" />
        <Rect x={1} y={2} width={2} height={2} fill="#6FB855" />
        <Rect x={6} y={5} width={2} height={2} fill="#4E8A37" />
        <Rect x={4} y={8} width={1} height={1} fill="#6FB855" />
        <Rect x={8} y={1} width={1} height={1} fill="#4E8A37" />
      </Pattern>
      {/* park (brighter, mown) */}
      <Pattern id="tx-park" width={10} height={10} patternUnits="userSpaceOnUse">
        <Rect width={10} height={10} fill="#67B24C" />
        <Rect x={0} y={0} width={10} height={1} fill="#5CA341" />
        <Rect x={2} y={4} width={2} height={2} fill="#76C05B" />
        <Rect x={7} y={7} width={2} height={2} fill="#5CA341" />
      </Pattern>
      {/* forest floor */}
      <Pattern id="tx-forest" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#2E4D28" />
        <Rect x={1} y={1} width={2} height={2} fill="#264220" />
        <Rect x={4} y={4} width={2} height={2} fill="#375E30" />
      </Pattern>
      {/* asphalt */}
      <Pattern id="tx-asphalt" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#7B7B7B" />
        <Rect x={2} y={1} width={1} height={1} fill="#6C6C6C" />
        <Rect x={5} y={4} width={1} height={1} fill="#8A8A8A" />
        <Rect x={1} y={6} width={1} height={1} fill="#6C6C6C" />
      </Pattern>
      <Pattern id="tx-asphaltMajor" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#8C8C8C" />
        <Rect x={2} y={1} width={1} height={1} fill="#7C7C7C" />
        <Rect x={5} y={4} width={1} height={1} fill="#9C9C9C" />
      </Pattern>
      {/* water waves */}
      <Pattern id="tx-water" width={12} height={8} patternUnits="userSpaceOnUse">
        <Rect width={12} height={8} fill="#4A7BA6" />
        <Rect x={1} y={2} width={4} height={1} fill="#5B8CB6" />
        <Rect x={7} y={5} width={4} height={1} fill="#3E6C94" />
      </Pattern>
      {/* sidewalk — pale concrete with joint lines */}
      <Pattern id="tx-sidewalk" width={10} height={10} patternUnits="userSpaceOnUse">
        <Rect width={10} height={10} fill="#B9B9B0" />
        <Rect x={0} y={0} width={10} height={1} fill="#A8A89F" />
        <Rect x={4} y={0} width={1} height={10} fill="#ADADA4" />
        <Rect x={7} y={6} width={1} height={1} fill="#C4C4BB" />
      </Pattern>
      {/* gravel footpath */}
      <Pattern id="tx-path" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#A08A5E" />
        <Rect x={1} y={2} width={1} height={1} fill="#8F7A50" />
        <Rect x={5} y={5} width={1} height={1} fill="#B29A6C" />
        <Rect x={3} y={6} width={1} height={1} fill="#8F7A50" />
      </Pattern>
      {/* sand */}
      <Pattern id="tx-sand" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#D8C38A" />
        <Rect x={2} y={3} width={1} height={1} fill="#C9B277" />
        <Rect x={6} y={6} width={1} height={1} fill="#E4D29B" />
      </Pattern>
      {/* roofs */}
      <Pattern id="tx-roofPlanks" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#9A6A3C" />
        <Rect x={0} y={0} width={8} height={1} fill="#7A5230" />
        <Rect x={0} y={4} width={8} height={1} fill="#835836" />
        <Rect x={3} y={1} width={1} height={3} fill="#835836" />
      </Pattern>
      <Pattern id="tx-roofCobble" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#8F8F8F" />
        <Rect x={0} y={0} width={3} height={3} fill="#7E7E7E" />
        <Rect x={4} y={4} width={3} height={3} fill="#7E7E7E" />
        <Rect x={4} y={0} width={2} height={2} fill="#9C9C9C" />
      </Pattern>
      <Pattern id="tx-roofBrick" width={8} height={8} patternUnits="userSpaceOnUse">
        <Rect width={8} height={8} fill="#A24E38" />
        <Rect x={0} y={0} width={8} height={1} fill="#853E2C" />
        <Rect x={0} y={4} width={8} height={1} fill="#853E2C" />
        <Rect x={2} y={1} width={1} height={3} fill="#8E4632" />
      </Pattern>
    </Defs>
  );
}
