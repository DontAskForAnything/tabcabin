/**
 * Original soundtrack for the promo video, synthesized from scratch (no samples, no third-party
 * music). 100 BPM, 22 bars = 52.8 s: pad intro, a lift into the logo at bar 3, a soft groove
 * under the feature scenes, a breakdown, and a ringing final chord. Sound effects cut to the
 * picture (sfx.ts) and a quiet wind and fire (ambience.ts) are mixed in.
 *
 * Run: node --experimental-strip-types scripts/promo/music.ts <out.wav>
 */
import { writeFileSync } from 'node:fs'
import { addForest } from './ambience.ts'
import { addSfx } from './sfx.ts'

const RATE = 48_000
const BPM = 100
const BEAT = 60 / BPM
const BAR = BEAT * 4
const BARS = 22
/** The last two bars ring out on one chord; the bar before them is a breakdown. */
const FINAL = BARS - 2
const BREAKDOWN = FINAL - 1
const LENGTH = BARS * BAR
const N = Math.ceil(LENGTH * RATE)

const left = new Float32Array(N)
const right = new Float32Array(N)

const midi = (note: number) => 440 * 2 ** ((note - 69) / 12)
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

// Deterministic noise so every render is identical.
let seed = 12345
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return (seed / 0x7fffffff) * 2 - 1
}

/** Adds a mono signal with a pan position (-1 left … 1 right). */
function write(i: number, value: number, pan = 0) {
  if (i < 0 || i >= N) return
  const l = Math.cos(((pan + 1) * Math.PI) / 4)
  const r = Math.sin(((pan + 1) * Math.PI) / 4)
  left[i]! += value * l
  right[i]! += value * r
}

// ---------- harmony ----------

const CHORDS = [
  { root: 41, tones: [53, 57, 60, 64] }, // Fmaj7
  { root: 45, tones: [57, 60, 64, 67] }, // Am7
  { root: 38, tones: [50, 53, 57, 60, 64] }, // Dm9
  { root: 46, tones: [46 + 12, 50 + 12, 53 + 12, 57 + 12] }, // Bbmaj7
]
const chordAt = (bar: number) => CHORDS[bar % 4]!

// ---------- instruments ----------

/** Warm pad: detuned saw-ish partials through a slowly opening low-pass filter. */
function pad(
  start: number,
  duration: number,
  notes: number[],
  gain: number,
  brightness: (t: number) => number,
) {
  const s0 = Math.floor(start * RATE)
  const len = Math.floor(duration * RATE)
  for (const [v, note] of notes.entries()) {
    for (const detune of [-0.07, 0.07]) {
      const f = midi(note + detune)
      let phase = 0
      let lp = 0
      const pan = (v / Math.max(1, notes.length - 1) - 0.5) * 0.8 * Math.sign(detune)
      for (let k = 0; k < len; k++) {
        const t = k / RATE
        const attack = clamp(t / 1.2, 0, 1)
        const release = clamp((duration - t) / 1.0, 0, 1)
        phase += f / RATE
        const x = phase % 1
        // A soft saw made of the first partials.
        const saw =
          Math.sin(2 * Math.PI * x) +
          Math.sin(4 * Math.PI * x) / 2 +
          Math.sin(6 * Math.PI * x) / 3.2
        const cutoff = clamp(brightness(start + t), 0.01, 0.6)
        lp += cutoff * (saw - lp)
        write(s0 + k, lp * gain * attack * release * 0.08, pan)
      }
    }
  }
}

/** Bell-like pluck: sine with a quiet fifth overtone and an exponential decay. */
function pluck(start: number, note: number, gain: number, pan: number, decay = 0.9) {
  const s0 = Math.floor(start * RATE)
  const len = Math.floor(decay * 2.5 * RATE)
  const f = midi(note)
  for (let k = 0; k < len; k++) {
    const t = k / RATE
    const env = Math.exp(-t / (decay * 0.35)) * clamp(t / 0.004, 0, 1)
    const v =
      Math.sin(2 * Math.PI * f * t) * 0.8 +
      Math.sin(2 * Math.PI * f * 2 * t) * 0.18 * Math.exp(-t * 6) +
      Math.sin(2 * Math.PI * f * 3 * t) * 0.06 * Math.exp(-t * 9)
    write(s0 + k, v * env * gain, pan)
  }
}

function bass(start: number, duration: number, note: number, gain: number) {
  const s0 = Math.floor(start * RATE)
  const len = Math.floor(duration * RATE)
  const f = midi(note)
  let lp = 0
  for (let k = 0; k < len; k++) {
    const t = k / RATE
    const env = clamp(t / 0.01, 0, 1) * clamp((duration - t) / 0.06, 0, 1)
    const raw = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)
    lp += 0.25 * (raw - lp)
    write(s0 + k, lp * env * gain, 0)
  }
}

function kick(start: number, gain: number) {
  const s0 = Math.floor(start * RATE)
  const len = Math.floor(0.45 * RATE)
  let phase = 0
  for (let k = 0; k < len; k++) {
    const t = k / RATE
    const f = 48 + 110 * Math.exp(-t * 28)
    phase += f / RATE
    const env = Math.exp(-t * 7.5)
    write(s0 + k, Math.sin(2 * Math.PI * phase) * env * gain, 0)
  }
}

/** Soft clap: filtered noise with a couple of quick repeats. */
function clap(start: number, gain: number) {
  for (const [offset, level] of [
    [0, 0.6],
    [0.012, 0.8],
    [0.024, 1],
  ] as const) {
    const s0 = Math.floor((start + offset) * RATE)
    const len = Math.floor(0.22 * RATE)
    let hp = 0
    let prev = 0
    for (let k = 0; k < len; k++) {
      const t = k / RATE
      const x = noise()
      hp = 0.85 * (hp + x - prev)
      prev = x
      write(s0 + k, hp * Math.exp(-t * 22) * gain * level * 0.5, k % 2 ? 0.15 : -0.15)
    }
  }
}

function hat(start: number, gain: number, pan: number) {
  const s0 = Math.floor(start * RATE)
  const len = Math.floor(0.06 * RATE)
  let prev = 0
  for (let k = 0; k < len; k++) {
    const t = k / RATE
    const x = noise()
    const hp = x - prev
    prev = x
    write(s0 + k, hp * Math.exp(-t * 70) * gain, pan)
  }
}

/** Rising filtered noise into a downbeat. */
function riser(start: number, duration: number, gain: number) {
  const s0 = Math.floor(start * RATE)
  const len = Math.floor(duration * RATE)
  let lp = 0
  for (let k = 0; k < len; k++) {
    const p = k / len
    lp += (0.02 + p * 0.5) * (noise() - lp)
    write(s0 + k, lp * p * p * gain, Math.sin(p * 9) * 0.4)
  }
}

// ---------- arrangement ----------

const barStart = (bar: number) => bar * BAR

// Pads through the whole piece; the filter opens over the intro and closes at the end.
for (let bar = 0; bar < BARS; bar++) {
  const chord = bar >= FINAL ? CHORDS[0]! : chordAt(bar)
  const tones = bar >= FINAL ? [53, 57, 60, 64, 67] : chord.tones
  const duration = bar === FINAL ? BAR * 2 : BAR + 0.15
  if (bar === FINAL + 1) break
  pad(barStart(bar), duration, tones, bar < 2 ? 0.8 : 1, (t) =>
    t < 4.8 ? 0.03 + (t / 4.8) * 0.09 : t > 40.8 ? 0.12 - ((t - 40.8) / 7.2) * 0.09 : 0.12,
  )
}

// Lift into the logo (bar 3) and a deep hit on the downbeat.
riser(barStart(1) + BEAT, BAR - BEAT, 0.35)
kick(barStart(2), 0.9)
bass(barStart(2), BEAT * 2, 29, 0.5)

// Bell arpeggio from bar 3, sparser at the end.
for (let bar = 2; bar < BARS; bar++) {
  const chord = bar >= FINAL ? CHORDS[0]! : chordAt(bar)
  const tones = [...chord.tones, chord.tones[1]! + 12]
  const steps = bar >= FINAL ? 4 : bar === BREAKDOWN ? 8 : 16
  for (let s = 0; s < steps; s++) {
    if (steps === 16 && (s === 6 || s === 14)) continue
    const step = BAR / steps
    const swing = steps === 16 && s % 2 === 1 ? step * 0.12 : 0
    const note = tones[(s * 3 + bar) % tones.length]! + 12
    const level = bar >= FINAL ? 0.16 : s % 4 === 0 ? 0.13 : 0.08
    pluck(
      barStart(bar) + s * step + swing,
      note,
      level,
      s % 2 ? 0.45 : -0.45,
      bar >= FINAL ? 2.2 : 0.9,
    )
  }
}

// Groove from bar 4 (index 3); the breakdown bar keeps only hats.
for (let bar = 3; bar < FINAL; bar++) {
  const chord = chordAt(bar)
  const t0 = barStart(bar)
  const breakdown = bar === BREAKDOWN
  for (let beat = 0; beat < 4; beat++) {
    if (!breakdown && (beat === 0 || beat === 2)) kick(t0 + beat * BEAT, 0.75)
    if (!breakdown && bar % 2 === 1 && beat === 2) kick(t0 + beat * BEAT + BEAT / 2, 0.45)
    if (!breakdown && (beat === 1 || beat === 3)) clap(t0 + beat * BEAT, 0.5)
    for (const half of [0, 1]) {
      const swing = half ? BEAT * 0.06 : 0
      hat(t0 + beat * BEAT + (half * BEAT) / 2 + swing, half ? 0.18 : 0.1, half ? 0.3 : -0.2)
    }
  }
  if (!breakdown) {
    // Bass: root on 1, octave pickup on the "and" of 3.
    bass(t0, BEAT * 1.6, chord.root - 12, 0.42)
    bass(t0 + BEAT * 2.5, BEAT * 0.45, chord.root, 0.3)
    bass(t0 + BEAT * 3, BEAT * 0.9, chord.root - 12, 0.38)
  }
}
// Final hit on the last chord.
kick(barStart(FINAL), 0.7)
bass(barStart(FINAL), BAR * 2, 29, 0.42)

// ---------- space and master ----------

/** Stereo delay (dotted eighth) on the whole mix, quietly. */
function delay(
  buffer: Float32Array,
  other: Float32Array,
  time: number,
  feedback: number,
  mix: number,
) {
  const d = Math.floor(time * RATE)
  for (let i = d; i < N; i++) buffer[i]! += other[i - d]! * mix + buffer[i - d]! * feedback * mix
}
const dl = left.slice()
const dr = right.slice()
delay(left, dr, BEAT * 0.75, 0.35, 0.22)
delay(right, dl, BEAT * 0.75, 0.35, 0.22)

// Sound effects cut to the picture (after the delay, so they do not echo on the beat).
addSfx(left, right, RATE)

/** Small Schroeder reverb for air. */
function reverb(input: Float32Array, out: Float32Array, wet: number, offset: number) {
  const combs = [1557, 1617, 1491, 1422].map((c) => ({
    buf: new Float32Array(c + offset),
    i: 0,
    lp: 0,
  }))
  const allpasses = [225, 556].map((c) => ({ buf: new Float32Array(c + offset), i: 0 }))
  for (let n = 0; n < N; n++) {
    const x = input[n]! * 0.25
    let sum = 0
    for (const c of combs) {
      const y = c.buf[c.i]!
      c.lp = y * 0.6 + c.lp * 0.4
      c.buf[c.i] = x + c.lp * 0.82
      c.i = (c.i + 1) % c.buf.length
      sum += y
    }
    for (const a of allpasses) {
      const y = a.buf[a.i]!
      const v = sum + y * 0.5
      a.buf[a.i] = v
      a.i = (a.i + 1) % a.buf.length
      sum = y - v * 0.5
    }
    out[n]! += sum * wet
  }
}
const rl = left.slice()
const rr = right.slice()
reverb(rl, left, 0.35, 0)
reverb(rr, right, 0.35, 23)
addForest(left, right, RATE)

// Fade in/out and soft-limit.
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!))
const norm = 0.9 / peak
for (let i = 0; i < N; i++) {
  const t = i / RATE
  const fade = clamp(t / 0.4, 0, 1) * clamp((LENGTH - t) / 2.5, 0, 1)
  left[i] = Math.tanh(left[i]! * norm * 1.15) * fade * 0.92
  right[i] = Math.tanh(right[i]! * norm * 1.15) * fade * 0.92
}

// ---------- WAV ----------

const out = process.argv[2] ?? 'music.wav'
const data = Buffer.alloc(44 + N * 4)
data.write('RIFF', 0)
data.writeUInt32LE(36 + N * 4, 4)
data.write('WAVEfmt ', 8)
data.writeUInt32LE(16, 16)
data.writeUInt16LE(1, 20)
data.writeUInt16LE(2, 22)
data.writeUInt32LE(RATE, 24)
data.writeUInt32LE(RATE * 4, 28)
data.writeUInt16LE(4, 32)
data.writeUInt16LE(16, 34)
data.write('data', 36)
data.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(clamp(left[i]!, -1, 1) * 32767), 44 + i * 4)
  data.writeInt16LE(Math.round(clamp(right[i]!, -1, 1) * 32767), 46 + i * 4)
}
writeFileSync(out, data)
console.warn(`Wrote ${out} (${LENGTH.toFixed(1)} s)`)
