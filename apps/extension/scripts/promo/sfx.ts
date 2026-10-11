/**
 * Sound effects cut to the picture: pops as tabs land, whooshes as they fly, plinks while the
 * cabin is built, an impact for the logo and each value line, and dings when the laptop and the
 * desktop sync. The screens change without a sound. Synthesized like the music (no samples). The
 * cue times follow timeline.ts.
 */
import { END_CARD, FOOTAGE_START, SYNC, VALUES } from './timeline.ts'

export function addSfx(left: Float32Array, right: Float32Array, rate: number) {
  let seed = 777
  const noise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed / 0x7fffffff) * 2 - 1
  }
  const write = (i: number, value: number, pan: number) => {
    if (i < 0 || i >= left.length) return
    left[i]! += value * Math.cos(((pan + 1) * Math.PI) / 4)
    right[i]! += value * Math.sin(((pan + 1) * Math.PI) / 4)
  }
  const midi = (note: number) => 440 * 2 ** ((note - 69) / 12)

  /** Noise swept up and back down through a band-pass, moving across the stereo field. */
  const whoosh = (at: number, length: number, gain: number, from = -0.6, to = 0.6) => {
    const s0 = Math.round(at * rate)
    const count = Math.round(length * rate)
    let low = 0
    let band = 0
    for (let k = 0; k < count; k++) {
      const x = k / count
      const swell = Math.sin(Math.PI * x) ** 2
      const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * x)
      low += cutoff * (noise() - low)
      band += 0.5 * (low - band)
      write(s0 + k, (low - band) * swell * gain, from + (to - from) * x)
    }
  }
  /** A round UI pop: a sine blip with a quick pitch drop. */
  const pop = (at: number, note: number, gain: number, pan = 0) => {
    const s0 = Math.round(at * rate)
    const count = Math.round(0.09 * rate)
    let phase = 0
    for (let k = 0; k < count; k++) {
      const t = k / rate
      phase += (midi(note) * (1 + 0.6 * Math.exp(-t * 60))) / rate
      write(
        s0 + k,
        Math.sin(2 * Math.PI * phase) * Math.exp(-t * 38) * Math.min(1, t / 0.002) * gain,
        pan,
      )
    }
  }
  /** A clean bell plink. */
  const plink = (at: number, note: number, gain: number, pan = 0) => {
    const s0 = Math.round(at * rate)
    const count = Math.round(0.8 * rate)
    const f = midi(note)
    for (let k = 0; k < count; k++) {
      const t = k / rate
      const v =
        Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 5) +
        Math.sin(2 * Math.PI * f * 3 * t) * 0.15 * Math.exp(-t * 14)
      write(s0 + k, v * Math.min(1, t / 0.002) * gain, pan)
    }
  }
  /** Low boom and a short burst of air: the hit under a big moment. */
  const impact = (at: number, gain: number) => {
    const s0 = Math.round(at * rate)
    const count = Math.round(1.4 * rate)
    let phase = 0
    let air = 0
    for (let k = 0; k < count; k++) {
      const t = k / rate
      phase += (38 + 50 * Math.exp(-t * 14)) / rate
      air += 0.3 * (noise() - air)
      const v = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 3.2) + air * 0.5 * Math.exp(-t * 18)
      write(s0 + k, v * Math.min(1, t / 0.003) * gain, 0)
    }
  }

  // 1. Forty tabs pile up, then fly into three groups and land.
  for (let i = 0; i < 15; i++) pop(0.05 * i + 0.08, 84 + ((i * 5) % 7), 0.13, (i % 5) / 2 - 1)
  whoosh(3.2, 0.7, 0.8)
  for (let i = 0; i < 15; i++)
    pop(
      4.25 + (i % 5) * 0.045 + Math.floor(i / 5) * 0.02,
      79 + (i % 3) * 2,
      0.1,
      (Math.floor(i / 5) - 1) * 0.6,
    )

  // 2. The tabs are pulled into the tile, and the cabin is built part by part.
  whoosh(4.65, 0.4, 0.55, 0.6, 0)
  impact(4.8, 0.55)
  const parts = [5.05, 5.15, 5.25, 5.45, 5.55, 5.65, 5.85]
  const notes = [77, 81, 84, 86, 89, 91, 93] // F major, rising
  parts.forEach((at, i) => plink(at, notes[i]!, 0.11, (i - 3) * 0.15))
  pop(6.2, 86, 0.07)

  // 3. The browser window.
  pop(FOOTAGE_START + 0.5, 88, 0.07, 0.3)

  // 4. Sync: each change leaves the laptop with a blip and lands on the desktop with a ding.
  pop(SYNC + 0.5, 74, 0.1)
  for (let k = 0; k < 3; k++) {
    const leave = SYNC + 1.2 + k * 1.15
    pop(leave, 79, 0.1, -0.6)
    plink(leave + 1.1, 84, 0.12, 0.6)
    plink(leave + 1.17, 91, 0.08, 0.6)
  }

  // 5. One hit for each value, then the end card.
  for (let i = 0; i < 3; i++) impact(VALUES + 0.1 + i * 0.65, 0.35)
  impact(END_CARD, 0.5)
  for (const at of [END_CARD + 1.2, END_CARD + 1.6]) pop(at, 86, 0.05)
}
