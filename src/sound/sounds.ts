/**
 * Sound design stub. Milestone 2 wires this to expo-audio with ORIGINAL
 * recorded/synthesized effects (no game-ripped audio):
 *
 *   paper-unfold  — opening the parchment map
 *   button-click  — stone-click UI tap
 *   wood-tap      — secondary tap / list row
 *   map-scribble  — route drawn onto the map
 *   route-done    — level-up style arrival chime
 *   reroute       — soft low thud when recalculating
 *
 * Screens already call play() at the right moments, so dropping in real
 * asset files later requires no screen changes.
 */
export type SoundName =
  | 'paper-unfold'
  | 'button-click'
  | 'wood-tap'
  | 'map-scribble'
  | 'route-done'
  | 'reroute';

export function play(name: SoundName): void {
  // Placeholder: intentionally silent until original SFX assets land.
  if (__DEV__) {
    console.log(`[sound] ${name}`);
  }
}
