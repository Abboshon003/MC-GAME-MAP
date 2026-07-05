/**
 * MC GAME MAP — typography tokens.
 *
 * Two open-source pixel fonts (OFL, commercial use permitted, legally
 * separate from any game IP):
 *   - display: "Press Start 2P" — blocky, low-res, for titles/buttons/labels
 *   - body:    "Pixelify Sans"  — pixel style but higher readability, for
 *              instructions, list rows and longer text
 *
 * Swap point: if a proprietary pixel font is commissioned later, only the
 * family names below change.
 */
export const fontFamilies = {
  display: 'PressStart2P_400Regular',
  body: 'PixelifySans_500Medium',
  bodyBold: 'PixelifySans_700Bold',
} as const;

export const fontSizes = {
  // Press Start 2P renders large; keep display sizes small.
  titleXL: 22,
  title: 16,
  button: 12,
  label: 9,
  tiny: 7,
  // Pixelify Sans body scale
  bodyLG: 22,
  body: 18,
  bodySM: 15,
  instruction: 26,
  distance: 34,
} as const;

export type FontFamilyToken = keyof typeof fontFamilies;
export type FontSizeToken = keyof typeof fontSizes;
