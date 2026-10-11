/**
 * The film's timeline in seconds, for the soundtrack (music.ts, sfx.ts, ambience.ts) and the
 * stills (encode.ts). promo.js draws the picture to the same numbers: change them together.
 */

/** One bar of the music (100 BPM, four beats); scenes change on bar lines and half bars. */
export const BAR = 2.4
/** The app scenes in the browser window and their lengths in bars, from bar 4 (the logo holds
    for a bar before them). */
export const SCENE_BARS = [2, 2, 2, 1.5, 1.5, 1.5, 1.5]
export const FOOTAGE_START = 4 * BAR
/** When each app scene starts; the last entry is the end of the last scene. */
export const SCENE_STARTS = SCENE_BARS.reduce(
  (starts, bars) => [...starts, starts.at(-1)! + bars * BAR],
  [FOOTAGE_START],
)
export const FOOTAGE_END = SCENE_STARTS.at(-1)!
/** Roughly when the sun sets, for the wind: promo.js sets it when the app turns dark in the last
    app scene ("Light and dark"), as the footage shows. */
export const SUNSET = [FOOTAGE_END - 1.4, FOOTAGE_END - 0.4] as const
export const SYNC = FOOTAGE_END
export const VALUES = SYNC + 2 * BAR
export const END_CARD = VALUES + BAR
/** The whole film: two bars of end card after the values. */
export const BARS = Math.round(END_CARD / BAR) + 2
