/**
 * Day/night cycle. Maps the user's local clock to a translucent color grade
 * drawn over the whole map — like a Minecraft day/night cycle. Kept dead
 * simple (clock-based, no sun ephemeris) and cheap to recompute.
 */

export interface Daylight {
  /** Overlay color drawn over the map. */
  tint: string;
  /** Overlay opacity 0..1. */
  opacity: number;
  label: 'DAY' | 'DUSK' | 'NIGHT' | 'DAWN';
}

/** Compute the tint for a given moment (defaults to now). */
export function daylightFor(date: Date = new Date()): Daylight {
  const h = date.getHours() + date.getMinutes() / 60;

  if (h >= 7 && h < 17) {
    return { tint: '#FFF6D8', opacity: 0.04, label: 'DAY' };
  }
  if (h >= 5 && h < 7) {
    // dawn — warm amber, easing out
    const k = (7 - h) / 2; // 1 → 0
    return { tint: '#E8892E', opacity: 0.1 + 0.18 * k, label: 'DAWN' };
  }
  if (h >= 17 && h < 20) {
    // dusk — deepening amber
    const k = (h - 17) / 3; // 0 → 1
    return { tint: '#C25A24', opacity: 0.1 + 0.18 * k, label: 'DUSK' };
  }
  // night — deep torch-lit blue
  return { tint: '#0B1A3A', opacity: 0.42, label: 'NIGHT' };
}
