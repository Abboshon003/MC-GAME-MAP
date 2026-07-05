/**
 * MC GAME MAP — spacing, borders and "hard" shadows.
 *
 * Rules: square corners everywhere (radius 0), pixel-width borders,
 * hard offset shadows (no blur), bevel = light top/left + dark bottom/right.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borders = {
  /** Outer pixel border width used on panels and buttons */
  pixel: 3,
  /** Inner bevel width (light/dark edges) */
  bevel: 4,
  /** Hairline pixel line */
  thin: 2,
  /** Corner radius is ALWAYS zero — square corners only */
  radius: 0,
} as const;

/** Hard shadow: solid offset block, zero blur. */
export const hardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.6,
  shadowRadius: 0,
  shadowOffset: { width: 3, height: 3 },
} as const;

/** Hard text shadow for pixel text (classic bottom-right ink). */
export const textShadow = {
  textShadowColor: '#1B1B1B',
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 0,
} as const;
