// Promo video timeline. Everything is a pure function of the time `t` (seconds), so the
// renderer can seek frame by frame: window.seek(t) → Promise (resolves when footage is ready).

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
const easeOut = (x) => 1 - (1 - x) ** 3
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
const easeBack = (x) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
}
const lerp = (a, b, x) => a + (b - a) * x
let seed = 11
const random = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

/** The cabin logo; `id` marks the parts that the intro draws one by one. */
const cabin = ({ tile = '#1F4A3A', house = '#F4EAD5', id = '' } = {}) =>
  `<svg viewBox="0 0 128 128" width="100%" height="100%" ${id ? `id="${id}"` : ''}>` +
  `<rect class="logo-tile" width="128" height="128" rx="30" fill="${tile}"/>` +
  `<path class="logo-chimney" d="M79 45 V31 a3 3 0 0 1 3 -3 H87 a3 3 0 0 1 3 3 V53 Z" fill="${house}"/>` +
  `<path class="logo-roof" pathLength="1" d="M24 64 L64 30 L104 64" fill="none" stroke="${house}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path class="logo-tab3" d="M52 77 V72 a3 3 0 0 1 3 -3 H73 a3 3 0 0 1 3 3 V77 Z" fill="${house}"/>` +
  `<path class="logo-tab2" d="M47 85 V79 a4 4 0 0 1 4 -4 H77 a4 4 0 0 1 4 4 V85 Z" fill="${house}" stroke="${tile}" stroke-width="3.5"/>` +
  `<path class="logo-tab1" d="M42 100 V92 a8 8 0 0 1 8 -8 H78 a8 8 0 0 1 8 8 V100 Z" fill="${house}" stroke="${tile}" stroke-width="3.5"/>` +
  `<path class="logo-walls" pathLength="1" d="M34 104 V58 M94 104 V58" fill="none" stroke="${house}" stroke-width="9" stroke-linecap="round"/>` +
  `<path class="logo-floor" pathLength="1" d="M28 104 H100" fill="none" stroke="${house}" stroke-width="9" stroke-linecap="round"/>` +
  `</svg>`
const LOGO = cabin()
/** On the pine background the cream tile stands out (variant B of the brand guide). */
const CREAM_LOGO = { tile: '#F4EAD5', house: '#1F4A3A' }

const stage = document.getElementById('stage')
const el = (html) => {
  const wrap = document.createElement('div')
  wrap.innerHTML = html.trim()
  const node = wrap.firstElementChild
  stage.append(node)
  return node
}
const set = (node, { x = 0, y = 0, s = 1, r = 0, o = 1, blur = 0 }) => {
  node.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`
  node.style.opacity = String(o)
  node.style.filter = blur ? `blur(${blur}px)` : ''
  node.style.visibility = o <= 0.001 ? 'hidden' : 'visible'
}
const words = (text, size, extra = '') =>
  text
    .split(' ')
    .map((w) => `<span class="word" style="${extra}">${w}</span>`)
    .join(`<span style="display:inline-block;width:${size * 0.26}px"></span>`)
/** Words rise in one after another from `start`. */
const revealWords = (node, t, start, stagger = 0.11, duration = 0.55) =>
  [...node.querySelectorAll('.word')].forEach((w, i) => {
    const p = easeOut(prog(t, start + i * stagger, start + i * stagger + duration))
    w.style.opacity = String(p)
    w.style.transform = `translateY(${(1 - p) * 36}px)`
    w.style.filter = p < 1 ? `blur(${(1 - p) * 10}px)` : ''
  })

// ---------- background ----------

const orbs = [
  ['#2f6b52', 620, 0.55],
  ['#6db592', 520, 0.22],
  ['#f4ead5', 480, 0.1],
].map(([color, size, alpha]) => {
  const node = document.createElement('div')
  node.className = 'orb'
  // A soft gradient instead of a blur filter: it looks the same and renders far faster.
  node.style.cssText += `width:${size}px;height:${size}px;background:radial-gradient(closest-side,${color},transparent);opacity:${alpha * 1.6}`
  document.getElementById('orbs').append(node)
  return node
})

// ---------- scene 1: chaos ----------

// [letter, color, title, group]
const TABS = [
  ['G', '#24292f', 'Pull requests · GitHub', 0],
  ['F', '#0f9d8a', 'Designing calm software', 1],
  ['M', '#34a853', 'Maps – Lisbon', 2],
  ['D', '#7cb342', 'Drizzle ORM – Overview', 0],
  ['Y', '#f26522', 'Show HN: Local-first apps', 1],
  ['B', '#003580', 'Booking – Stays', 2],
  ['C', '#22b638', 'Caddy – Reverse proxy', 0],
  ['W', '#4f46e5', 'Web Vitals | web.dev', 1],
  ['P', '#e60023', 'Pastéis de nata spots', 2],
  ['H', '#f05a28', 'Hono – Middleware', 0],
  ['S', '#e8463c', 'Smashing Magazine', 1],
  ['T', '#f2b705', 'Tram 28 timetable', 2],
  ['R', '#ff4500', 'r/selfhosted', 0],
  ['A', '#8b5cf6', 'The art of focus', 1],
  ['L', '#0b5cad', 'Flights to Lisbon', 2],
]
const GROUPS = [
  ['🛠️', 'Side project'],
  ['📚', 'Read later'],
  ['✈️', 'Trip to Lisbon'],
]
const cards = GROUPS.map(([emoji, title], i) =>
  el(
    `<div class="card layer" style="left:${330 + i * 440}px;top:330px"><div class="card-head"><span>${emoji}</span>${title}</div></div>`,
  ),
)
/** A spot for a scattered tab that keeps the headline in the middle readable. */
const scatter = () => {
  for (;;) {
    const x = 60 + random() * 1560
    const y = 60 + random() * 900
    if (!(x > 120 && x < 1540 && y > 300 && y < 700)) return { x, y }
  }
}
const chips = TABS.map(([letter, color, title, group], i) => {
  const node = el(
    `<div class="chip layer"><span class="tile" style="background:${color}">${letter}</span>${title}</div>`,
  )
  const slot = Math.floor(i / 3)
  return {
    node,
    from: { ...scatter(), r: (random() - 0.5) * 30, phase: random() * Math.PI * 2 },
    to: { x: 330 + group * 440 + 24, y: 330 + 92 + slot * 72 },
  }
})
const headline = el(
  `<div class="big layer" style="top:410px;font-size:124px;text-shadow:0 10px 50px rgb(2 12 8 / .7)">${words('40 tabs open?', 124)}</div>`,
)
const again = el(
  `<div class="big layer" style="top:565px;font-size:104px;color:#f4ead5;text-shadow:0 10px 50px rgb(2 12 8 / .7)">${words('Give them a cabin.', 104)}</div>`,
)

// ---------- scene 2: logo ----------

const logoTile = el(
  `<div class="layer" style="left:880px;top:300px;width:160px;height:160px;filter:drop-shadow(0 24px 40px rgb(2 12 8 / .5))">${cabin({ ...CREAM_LOGO, id: 'build' })}</div>`,
)
const part = (name) => logoTile.querySelector(`.logo-${name}`)
const logoName = el(
  `<div class="big layer" style="top:500px;font-size:124px">${words('TabCabin', 124)}</div>`,
)
const tagline = el(
  `<div class="big layer plain" style="top:660px;font-size:46px;font-weight:500;color:rgb(244 234 213 / .85)">${words('A calm cabin for your tabs.', 46)}</div>`,
)

const logoPill = el(
  `<div class="layer" style="left:0;right:0;top:765px;text-align:center"><span class="pill">A browser extension for Chrome, Edge and Brave</span></div>`,
)

// ---------- scenes 3–9: footage in a browser window ----------

const ICON = {
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4c7c5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  forward:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f7378" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  reload:
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c4c7c5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  puzzle:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4c7c5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.4 4.6a2 2 0 0 0-3.4 1.4V7H8a1 1 0 0 0-1 1v4H6a2 2 0 1 0 0 4h1v4a1 1 0 0 0 1 1h4v-1a2 2 0 1 1 4 0v1h4a1 1 0 0 0 1-1v-4h-1a2 2 0 1 1 0-4h1V8a1 1 0 0 0-1-1h-4V6a2 2 0 0 0-.6-1.4z"/></svg>',
  globe:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4c7c5" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  tune: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c4c7c5" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  search:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
}
const browser = el(
  `<div id="browser" class="layer">
    <div class="tabstrip">
      <div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
      <div class="tab"><span class="tab-icon"></span><span class="tab-title"></span><span class="tab-x">×</span></div>
      <span class="newtab">+</span>
      <div class="callout layer">← Every new tab opens TabCabin</div>
    </div>
    <div class="toolbar">
      ${ICON.back}${ICON.forward}${ICON.reload}
      <div class="omnibox"></div>
      <span class="ext"><span style="width:20px;height:20px;display:flex">${LOGO}</span><b class="badge">1</b><i class="ring"></i></span>
      ${ICON.puzzle}
      <span class="avatar">M</span>
    </div>
    <div class="screen"><img id="footage" alt=""></div>
  </div>`,
)
const footage = document.getElementById('footage')
const callout = browser.querySelector('.callout')
const ring = browser.querySelector('.ring')
const PAGES = {
  newtab: {
    icon: LOGO,
    title: 'New Tab',
    omnibox: `${ICON.search}<span class="placeholder">Search Google or type a URL</span>`,
  },
  article: {
    icon: ICON.globe,
    title: 'Designing calm software · Field notes',
    omnibox: `${ICON.tune}<span>journal.example.dev/calm-software</span>`,
  },
}
let shownPage = ''
const showPage = (name) => {
  if (shownPage === name) return
  shownPage = name
  const page = PAGES[name]
  browser.querySelector('.tab-icon').innerHTML = page.icon
  browser.querySelector('.tab-title').textContent = page.title
  browser.querySelector('.omnibox').innerHTML = page.omnibox
}
const caption = el(
  `<div id="caption" class="layer"><div class="kicker"></div><h2></h2><p></p></div>`,
)

/** Hyphenated words never break across lines. */
const keepWhole = (text) => text.replace(/(\S+-\S+)/g, '<span style="white-space:nowrap">$1</span>')

const BAR = 2.4
const SCENES = [
  {
    mark: 'drag',
    until: 'todo',
    start: 3 * BAR,
    title: 'Drag tabs into groups.',
    sub: 'Saved and closed in one move.',
  },
  {
    mark: 'capture',
    until: 'capture-end',
    page: 'article',
    start: 5 * BAR,
    title: 'Save any page in one click.',
    sub: 'Or press <kbd>Ctrl Shift S</kbd> to add a note, a group and a reminder.',
    speed: 2.3,
  },
  {
    mark: 'todo',
    until: 'search',
    start: 7 * BAR,
    title: 'Notes and to-dos next to your links.',
    sub: 'Type <kbd>/todo</kbd> and press Enter.',
  },
  {
    mark: 'search',
    until: 'collections',
    start: 9 * BAR,
    title: 'Find anything with <kbd>⌘K</kbd>',
    sub: 'Or <kbd>Ctrl K</kbd>: every workspace, open tab and bookmark.',
  },
  {
    mark: 'collections',
    until: 'reminders',
    start: 11 * BAR,
    title: 'Boards or collections.',
    sub: 'Pick the view that fits each category.',
    speed: 1.6,
  },
  {
    mark: 'reminders',
    until: 'dark',
    start: 13 * BAR,
    title: 'Reminders when it matters.',
    sub: 'One-time, weekly or monthly — with notifications.',
  },
  {
    mark: 'dark',
    until: 'end',
    start: 15 * BAR,
    title: 'Light and dark.',
    sub: 'And a compact layout for smaller screens.',
  },
].map((scene, i) => ({ ...scene, n: String(i + 1).padStart(2, '0') }))
const FOOTAGE_START = SCENES[0].start
const FOOTAGE_END = 17 * BAR

let index = null
/** Per scene: frames on a compressed clock where idle pauses are shortened. */
let tracks = []
async function loadFootage() {
  index = await (await fetch('/footage/index.json')).json()
  const markTime = (name) => index.marks.find((m) => m.name === name).t
  tracks = SCENES.map((scene) => {
    const from = markTime(scene.mark)
    const to = markTime(scene.until)
    const frames = index.frames.filter((f) => f.t >= from - 0.05 && f.t < to)
    let clock = 0
    const timed = frames.map((f, k) => {
      if (k > 0) clock += Math.min(f.t - frames[k - 1].t, 0.16)
      return { file: f.file, c: clock }
    })
    return { frames: timed, total: clock }
  })
}

let currentSrc = ''
async function showFrame(scene, local, duration) {
  const track = tracks[scene]
  if (!track || track.frames.length === 0) return
  const speed = SCENES[scene].speed ?? Math.max(1, track.total / (duration - 0.5))
  const target = Math.max(0, local - 0.15) * speed
  let frame = track.frames[0]
  for (const f of track.frames) {
    if (f.c <= target) frame = f
    else break
  }
  const src = `/footage/${frame.file}`
  if (src !== currentSrc) {
    currentSrc = src
    footage.src = src
    await footage.decode().catch(() => undefined)
  }
}

// ---------- scene 9: sync ----------

const syncTitle = el(
  `<div class="big layer" style="top:120px;font-size:80px">${words('In sync on all your computers.', 80)}</div>`,
)
const syncSub = el(
  `<div class="big layer plain" style="top:232px;font-size:30px;font-weight:500;color:rgb(244 234 213 / .78)">Sign in with Google — or run the server yourself.</div>`,
)
const left = el(
  `<div class="window layer" style="left:180px;top:356px"><img src="/shots/board-light.png" alt=""></div>`,
)
const right = el(
  `<div class="window layer" style="left:1120px;top:356px"><img src="/shots/board-dark.png" alt=""></div>`,
)
const lineL = el(`<div class="line layer" style="left:800px;width:80px"></div>`)
const lineR = el(`<div class="line layer" style="left:1040px;width:80px"></div>`)
const server = el(
  `<div id="server" class="layer"><svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#1f4a3a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg></div>`,
)
const serverLabel = el(
  `<div class="big layer plain" style="top:660px;font-size:22px;font-weight:500;color:rgb(244 234 213 / .7)">Your sync server</div>`,
)
const labelL = el(
  `<div class="layer" style="left:180px;top:800px;width:620px;text-align:center;font-size:22px;color:rgb(244 234 213 / .7)">Laptop</div>`,
)
const labelR = el(
  `<div class="layer" style="left:1120px;top:800px;width:620px;text-align:center;font-size:22px;color:rgb(244 234 213 / .7)">Desktop</div>`,
)
const packets = [0, 1, 2].map(() => el(`<div class="packet layer" style="left:0;top:0"></div>`))
const synced = el(
  `<div class="layer pill" style="left:1290px;top:310px;font-size:20px;padding:10px 18px;background:#6db592;color:#0f1110;border:0">✓ Synced</div>`,
)

// ---------- scene 10: values ----------

const values = ['No account needed.', 'No tracking.', 'Open source.'].map((text, i) =>
  el(
    `<div class="big layer" style="top:${300 + i * 150}px;font-size:110px;${i === 2 ? 'color:#f4ead5' : ''}">${words(text, 110)}</div>`,
  ),
)

// ---------- scene 11: end card ----------

const endLogo = el(
  `<div class="layer" style="left:890px;top:250px;width:140px;height:140px;filter:drop-shadow(0 24px 40px rgb(2 12 8 / .5))">${cabin(CREAM_LOGO)}</div>`,
)
const endName = el(`<div class="big layer" style="top:420px;font-size:116px">TabCabin</div>`)
const endTag = el(
  `<div class="big layer plain" style="top:560px;font-size:42px;font-weight:500;color:rgb(244 234 213 / .85)">A calm cabin for your tabs.</div>`,
)
const endPill = el(
  `<div class="layer" style="left:0;right:0;top:665px;text-align:center"><span class="pill">Free browser extension · Chrome · Edge · Brave</span></div>`,
)
const endUrl = el(
  `<div class="big layer plain" style="top:790px;font-size:26px;font-weight:500;color:rgb(244 234 213 / .6)">github.com/DontAskForAnything/tabcabin</div>`,
)

// ---------- timeline ----------

window.DURATION = 22 * BAR

window.seek = async (t) => {
  // Background drift.
  orbs.forEach((orb, i) => {
    const a = t * (0.12 + i * 0.05) + i * 2
    orb.style.transform = `translate(${960 - 300 + Math.cos(a) * (520 - i * 90)}px, ${540 - 300 + Math.sin(a * 1.3) * (300 - i * 40)}px)`
  })

  // Scene 1: scattered tabs drift, headline, then the tabs settle into groups.
  const settle = easeInOut(prog(t, 3.3, 4.6))
  const vanish = easeInOut(prog(t, 4.8, 5.3))
  chips.forEach((chip, i) => {
    const drift = 1 - settle
    const fx = chip.from.x + Math.sin(t * 0.7 + chip.from.phase) * 22
    const fy = chip.from.y + Math.cos(t * 0.6 + chip.from.phase) * 16
    const enter = easeOut(prog(t, 0.05 * i, 0.05 * i + 0.6))
    set(chip.node, {
      x: lerp(fx, chip.to.x, settle) * (1 - vanish) + 960 * vanish - 150 * vanish,
      y: lerp(fy, chip.to.y, settle) * (1 - vanish) + 380 * vanish,
      r: chip.from.r * drift,
      s: (1 - 0.6 * vanish) * (0.92 + 0.08 * enter),
      o: enter * (1 - vanish) * (0.7 + 0.3 * settle),
      blur: 2 * drift,
    })
  })
  cards.forEach((card, i) =>
    set(card, {
      o: easeOut(prog(t, 3.5 + i * 0.08, 4.3 + i * 0.08)) * (1 - vanish),
      s: 1 - 0.3 * vanish,
      y: (1 - easeOut(prog(t, 3.5, 4.3))) * 30,
      x: (960 - (330 + i * 440 + 190)) * vanish,
    }),
  )
  revealWords(headline, t, 0.35)
  revealWords(again, t, 1.6, 0.11, 0.6)
  const headOut = easeInOut(prog(t, 3.0, 3.5))
  set(headline, { o: 1 - headOut, y: -40 * headOut })
  set(again, { o: 1 - headOut, y: -40 * headOut })

  // Scene 2: the tabs fly into a tile and the cabin is built: roof, floor and walls are drawn,
  // the three tabs slide in from the front to the back, and the chimney goes up last.
  const logoIn = easeBack(prog(t, 4.95, 5.45))
  const logoOut = easeInOut(prog(t, 6.75, 7.25))
  set(logoTile, {
    s: logoIn * (1 - 0.3 * logoOut),
    o: prog(t, 4.95, 5.1) * (1 - logoOut),
    y: -120 * logoOut,
  })
  const draw = (name, from, to) => {
    const p = easeInOut(prog(t, from, to))
    const node = part(name)
    node.style.strokeDasharray = '1 1'
    node.style.strokeDashoffset = String(1 - p)
    node.style.opacity = p > 0 ? '1' : '0'
  }
  draw('roof', 5.05, 5.4)
  draw('floor', 5.15, 5.4)
  draw('walls', 5.25, 5.55)
  ;['tab1', 'tab2', 'tab3'].forEach((name, i) => {
    const from = 5.45 + i * 0.1
    const node = part(name)
    node.style.opacity = String(prog(t, from, from + 0.08))
    node.style.transform = `translateY(${(1 - easeBack(prog(t, from, from + 0.3))) * 24}px)`
  })
  const chimney = part('chimney')
  chimney.style.transformOrigin = '50% 100%'
  chimney.style.transform = `scaleY(${easeBack(prog(t, 5.85, 6.1))})`
  chimney.style.opacity = t < 5.85 ? '0' : '1'
  revealWords(logoName, t, 5.75, 0.1, 0.45)
  revealWords(tagline, t, 6.0, 0.05, 0.45)
  set(logoName, { o: t < 5.7 ? 0 : 1 - logoOut, y: -120 * logoOut })
  set(tagline, { o: t < 5.95 ? 0 : 1 - logoOut, y: -120 * logoOut })
  const pillIn = easeOut(prog(t, 6.2, 6.5))
  set(logoPill, { o: pillIn * (1 - logoOut), y: (1 - pillIn) * 20 - 120 * logoOut })

  // Footage scenes in a browser window with captions.
  const browserIn = easeOut(prog(t, FOOTAGE_START - 0.3, FOOTAGE_START + 0.4))
  const browserOut = easeInOut(prog(t, FOOTAGE_END - 0.35, FOOTAGE_END + 0.15))
  const inFootage = t > FOOTAGE_START - 0.3 && t < FOOTAGE_END + 0.15
  set(browser, {
    o: inFootage ? browserIn * (1 - browserOut) : 0,
    y: (1 - browserIn) * 260 + browserOut * 80,
    s: 0.9 + 0.05 * browserIn - 0.05 * browserOut + Math.max(0, t - FOOTAGE_START) * 0.0006,
  })
  // Point out that this is the browser's new tab page, and the toolbar icon.
  const calloutOn =
    easeOut(prog(t, FOOTAGE_START + 0.5, FOOTAGE_START + 0.9)) *
    (1 - easeInOut(prog(t, FOOTAGE_START + 3.4, FOOTAGE_START + 3.8)))
  set(callout, { o: calloutOn, x: (1 - calloutOn) * 24 })
  const pulse = prog(t, FOOTAGE_START + 1.0, FOOTAGE_START + 3.4)
  const wave = (pulse * 2) % 1
  set(ring, { o: pulse > 0 && pulse < 1 ? 1 - wave : 0, s: 0.8 + wave * 0.9 })
  let pending = null
  if (inFootage) {
    const i = SCENES.findIndex((s, k) => t >= s.start && t < (SCENES[k + 1]?.start ?? FOOTAGE_END))
    const sceneIndex = Math.max(0, i)
    const scene = SCENES[sceneIndex]
    const end = SCENES[sceneIndex + 1]?.start ?? FOOTAGE_END
    const local = Math.max(0, t - scene.start)
    showPage(scene.page ?? 'newtab')
    pending = showFrame(sceneIndex, local, end - scene.start)
    // Caption.
    const capIn = easeOut(prog(local, 0.05, 0.6))
    const capOut = easeInOut(prog(t, end - 0.35, end))
    if (caption.dataset.scene !== scene.n) {
      caption.dataset.scene = scene.n
      caption.querySelector('.kicker').textContent = scene.n
      caption.querySelector('h2').innerHTML = keepWhole(scene.title)
      caption.querySelector('p').innerHTML = keepWhole(scene.sub)
    }
    set(caption, { o: capIn * (1 - capOut), y: (1 - capIn) * 40 - capOut * 30 })
  } else {
    set(caption, { o: 0 })
  }

  // Scene 9: sync between two computers through a server.
  const S0 = 17 * BAR
  const S1 = 19 * BAR
  const syncIn = (d) => easeOut(prog(t, S0 + d, S0 + d + 0.6))
  const syncOut = easeInOut(prog(t, S1 - 0.4, S1))
  revealWords(syncTitle, t, S0 + 0.1, 0.08, 0.5)
  set(syncTitle, { o: t < S0 ? 0 : 1 - syncOut })
  set(syncSub, { o: syncIn(0.5) * (1 - syncOut), y: (1 - syncIn(0.5)) * 20 })
  set(left, { o: syncIn(0.2) * (1 - syncOut), x: (1 - syncIn(0.2)) * -80 })
  set(right, { o: syncIn(0.35) * (1 - syncOut), x: (1 - syncIn(0.35)) * 80 })
  set(server, { o: syncIn(0.5) * (1 - syncOut), s: easeBack(prog(t, S0 + 0.5, S0 + 1.1)) || 0.001 })
  set(serverLabel, { o: syncIn(0.7) * (1 - syncOut) })
  set(lineL, { o: syncIn(0.8) * (1 - syncOut) })
  set(lineR, { o: syncIn(0.8) * (1 - syncOut) })
  set(labelL, { o: syncIn(0.6) * (1 - syncOut) })
  set(labelR, { o: syncIn(0.6) * (1 - syncOut) })
  packets.forEach((packet, k) => {
    const p = (t - (S0 + 1.2) - k * 1.15) / 1.1
    const on = p >= 0 && p <= 1 && t < S1 - 0.4
    const x = p < 0.5 ? lerp(790, 951, easeInOut(p * 2)) : lerp(951, 1112, easeInOut(p * 2 - 1))
    set(packet, { x, y: 541, o: on ? 1 : 0, s: on ? 1 : 0.5 })
  })
  const syncedPulse = [0, 1, 2].reduce((m, k) => {
    const arrive = S0 + 1.2 + k * 1.15 + 1.1
    return Math.max(m, prog(t, arrive, arrive + 0.15) * (1 - prog(t, arrive + 0.75, arrive + 1.0)))
  }, 0)
  set(synced, {
    o: syncedPulse * (1 - syncOut),
    s: 0.8 + 0.2 * syncedPulse,
    y: (1 - syncedPulse) * 10,
  })

  // Scene 10: values.
  const V0 = 19 * BAR
  const valuesOut = easeInOut(prog(t, 20 * BAR - 0.3, 20 * BAR))
  values.forEach((node, i) => {
    revealWords(node, t, V0 + 0.1 + i * 0.65, 0.08, 0.45)
    set(node, { o: t < V0 ? 0 : 1 - valuesOut, y: -30 * valuesOut })
  })

  // Scene 11: end card.
  const E0 = 20 * BAR
  const endFade = 1 - easeInOut(prog(t, window.DURATION - 0.9, window.DURATION))
  set(endLogo, { o: prog(t, E0, E0 + 0.3) * endFade, s: easeBack(prog(t, E0, E0 + 0.6)) || 0.001 })
  set(endName, {
    o: easeOut(prog(t, E0 + 0.3, E0 + 0.9)) * endFade,
    y: (1 - easeOut(prog(t, E0 + 0.3, E0 + 0.9))) * 30,
  })
  set(endTag, {
    o: easeOut(prog(t, E0 + 0.7, E0 + 1.3)) * endFade,
    y: (1 - easeOut(prog(t, E0 + 0.7, E0 + 1.3))) * 24,
  })
  set(endPill, {
    o: easeOut(prog(t, E0 + 1.2, E0 + 1.8)) * endFade,
    y: (1 - easeOut(prog(t, E0 + 1.2, E0 + 1.8))) * 20,
  })
  set(endUrl, { o: easeOut(prog(t, E0 + 1.6, E0 + 2.2)) * endFade })
  document.getElementById('stage').style.opacity = String(t > E0 ? endFade : 1)

  if (pending) await pending
}

window.ready = (async () => {
  await document.fonts.ready
  await loadFootage()
  await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)))
})()
