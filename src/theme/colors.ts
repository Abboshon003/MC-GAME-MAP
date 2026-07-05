/**
 * MC GAME MAP — color tokens.
 *
 * Muted block-game palette. No neon, no gradients, no gloss.
 * Every color in the app must come from this file.
 */
export const colors = {
  // Parchment (the map item)
  parchment: '#E8D9A0',
  parchmentDeep: '#D8C38A',
  parchmentShadow: '#B89F66',
  parchmentInk: '#5C4A2A',

  // Terrain
  dirt: '#7A5230',
  dirtDark: '#5C3E22',
  dirtLight: '#96683E',
  grass: '#5FA346',
  grassDark: '#4A8237',
  forest: '#2E4D28',
  water: '#4A7BA6',
  waterDark: '#3A628A',
  sand: '#D8C38A',
  stone: '#8A8A8A',
  stoneDark: '#5E5E5E',

  // UI surfaces
  charcoal: '#2B2B2B',
  panelStone: '#3A3A3A',
  panelStoneLight: '#4A4A4A',
  panelStoneDark: '#242424',
  slot: '#8B8B8B',
  slotDark: '#373737',
  slotLight: '#FFFFFF',

  // Buttons (gray beveled block)
  button: '#6F6F6F',
  buttonLight: '#9C9C9C',
  buttonDark: '#3F3F3F',
  buttonPressed: '#5A5A5A',
  buttonBorder: '#1B1B1B',

  // Route
  routeGold: '#F2C438',
  routeGoldDark: '#C89B22',
  routeOutline: '#7A4E1E',

  // Accents
  xpGreen: '#7FCC19',
  xpGreenDark: '#4E8A0E',
  dangerRed: '#B4322A',
  bannerRed: '#8E2620',

  // Text
  textLight: '#ECECEC',
  textDim: '#A0A0A0',
  textShadow: '#1B1B1B',
  textGoldTitle: '#F2C438',
  textOnParchment: '#4A3A1E',
} as const;

export type ColorToken = keyof typeof colors;
