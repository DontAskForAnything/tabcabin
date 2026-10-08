/**
 * Forest sounds under the music, synthesized like the music itself (no recordings): a soft wind
 * through the whole film and a small crackling fire on the end card.
 */

/** Times in seconds that match the film (see promo.js): the end card starts at 48 s. */
const END_CARD = 48

export function addForest(left: Float32Array, right: Float32Array, rate: number) {
  const length = left.length / rate
  let seed = 4242
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const write = (i: number, value: number, pan: number) => {
    if (i < 0 || i >= left.length) return
    left[i]! += value * Math.cos(((pan + 1) * Math.PI) / 4)
    right[i]! += value * Math.sin(((pan + 1) * Math.PI) / 4)
  }
  const ramp = (t: number, from: number, to: number) =>
    Math.min(1, Math.max(0, (t - from) / (to - from)))

  // Wind: brown noise through a slowly breathing low-pass, a little stronger at sunset.
  let brownL = 0
  let brownR = 0
  let lowL = 0
  let lowR = 0
  for (let i = 0; i < left.length; i++) {
    const t = i / rate
    brownL = (brownL + (random() * 2 - 1) * 0.02) * 0.998
    brownR = (brownR + (random() * 2 - 1) * 0.02) * 0.998
    const breath = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1)
    const cutoff = 0.004 + 0.01 * breath
    lowL += (brownL - lowL) * cutoff * 6
    lowR += (brownR - lowR) * cutoff * 6
    const gain = (0.08 + 0.06 * breath) * (1 + 0.6 * Math.sin(Math.PI * ramp(t, 35, 43)))
    left[i]! += lowL * gain
    right[i]! += lowR * gain
  }

  // A small fire on the end card: soft crackles and a low rumble.
  for (let t = END_CARD + 0.3; t < length; t += 0.03 + random() * 0.12) {
    const level = 0.22 * ramp(t, END_CARD, END_CARD + 1.2) * (0.3 + random() * 0.7)
    const pan = random() * 0.6 - 0.3
    const count = Math.round((0.002 + random() * 0.006) * rate)
    let last = 0
    for (let k = 0; k < count; k++) {
      const noise = random() * 2 - 1
      last += (noise - last) * 0.5
      write(Math.round(t * rate) + k, last * level * (1 - k / count), pan)
    }
  }
  let rumble = 0
  for (let i = Math.round(END_CARD * rate); i < left.length; i++) {
    rumble += ((random() * 2 - 1) * 0.1 - rumble) * 0.01
    const value = rumble * 0.5 * ramp(i / rate, END_CARD, END_CARD + 1.5)
    left[i]! += value
    right[i]! += value
  }
}
