import {
  type Bundle,
  type Item,
  makeCategory,
  makeGroup,
  makeItem,
  makeReminder,
  makeWorkspace,
  positionsAtEnd,
} from '@tabhangar/core'

/** Favicons for the demo come from a public favicon service (the profile has no history). */
const icon = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`

type Spec =
  | { link: string; title: string; text?: string; color?: Item['color'] }
  | { note: string; color?: Item['color'] }
  | { todo: string; done?: boolean }
  | { stack: string; links: [string, string][] }

/** Self-written demo workspaces used for README screenshots and the demo animation. */
export function demoBundle(now = Date.now()): Bundle {
  const clock = { now }
  const bundle: Bundle = { workspaces: [], categories: [], groups: [], items: [], reminders: [] }

  const addGroup = (
    categoryId: string,
    position: string,
    emoji: string,
    title: string,
    specs: Spec[],
    width?: number,
  ) => {
    const group = makeGroup({ categoryId, position, emoji, title, width: width ?? null }, clock)
    bundle.groups.push(group)
    const keys = positionsAtEnd([], specs.length)
    specs.forEach((spec, i) => {
      const base = { groupId: group.id, position: keys[i]! }
      if ('link' in spec)
        bundle.items.push(
          makeItem(
            {
              ...base,
              kind: 'link',
              url: spec.link,
              title: spec.title,
              favIconUrl: icon(spec.link),
              text: spec.text ?? '',
              color: spec.color ?? null,
            },
            clock,
          ),
        )
      else if ('note' in spec)
        bundle.items.push(
          makeItem({ ...base, kind: 'note', text: spec.note, color: spec.color ?? null }, clock),
        )
      else if ('todo' in spec)
        bundle.items.push(
          makeItem(
            { ...base, kind: 'note', text: spec.todo, todo: true, done: spec.done ?? false },
            clock,
          ),
        )
      else {
        const stack = makeItem({ ...base, kind: 'stack', title: spec.stack }, clock)
        bundle.items.push(stack)
        const childKeys = positionsAtEnd([], spec.links.length)
        spec.links.forEach(([url, title], j) =>
          bundle.items.push(
            makeItem(
              {
                groupId: group.id,
                parentId: stack.id,
                position: childKeys[j]!,
                kind: 'link',
                url,
                title,
                favIconUrl: icon(url),
              },
              clock,
            ),
          ),
        )
      }
    })
    return group
  }

  const [w0, w1] = positionsAtEnd([], 2)
  const work = makeWorkspace({ name: 'Side project', emoji: '🚀', position: w0! }, clock)
  const home = makeWorkspace({ name: 'Home', emoji: '🏡', position: w1! }, clock)
  bundle.workspaces.push(work, home)

  const catKeys = positionsAtEnd([], 4)
  const [today, research, reading, archive] = ['Today', 'Research', 'Reading', 'Archive'].map(
    (name, i) => makeCategory({ workspaceId: work.id, name, position: catKeys[i]! }, clock),
  )
  bundle.categories.push(today!, research!, reading!, archive!)
  const homeCat = makeCategory({ workspaceId: home.id, name: 'Trips', position: 'a0' }, clock)
  bundle.categories.push(homeCat)

  const g = positionsAtEnd([], 4)
  addGroup(today!.id, g[0]!, '🎯', 'Launch week', [
    { todo: 'Write the changelog', done: true },
    { todo: 'Record a 30-second demo' },
    { todo: 'Post on the forum' },
    { todo: 'Reply to beta testers' },
    { note: 'Ship small, ship often.\nNo new features until Friday.', color: 'amber' },
  ])
  addGroup(today!.id, g[1]!, '🛠️', 'Build', [
    { link: 'https://github.com/', title: 'GitHub · Pull requests' },
    { link: 'https://hono.dev/docs/', title: 'Hono – Web framework built on Web Standards' },
    {
      link: 'https://orm.drizzle.team/docs/overview',
      title: 'Drizzle ORM – Overview',
      text: 'Try the SQLite driver first',
      color: 'sky',
    },
    {
      stack: 'Design',
      links: [
        ['https://www.figma.com/', 'Figma'],
        ['https://dribbble.com/', 'Dribbble'],
      ],
    },
    { link: 'https://tailwindcss.com/docs', title: 'Tailwind CSS – Documentation' },
  ])
  addGroup(today!.id, g[2]!, '📚', 'Read later', [
    { link: 'https://web.dev/articles/vitals', title: 'Web Vitals | web.dev' },
    {
      link: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API',
      title: 'IndexedDB API – MDN',
    },
    {
      link: 'https://www.smashingmagazine.com/',
      title: 'Smashing Magazine — For Web Designers And Developers',
    },
    { link: 'https://news.ycombinator.com/', title: 'Hacker News' },
  ])
  addGroup(today!.id, g[3]!, '🎧', 'Focus', [
    { link: 'https://www.youtube.com/', title: 'lofi hip hop radio – beats to relax/study to' },
    { link: 'https://open.spotify.com/', title: 'Deep Focus · Spotify' },
    { note: '25 min on, 5 min off', color: 'lilac' },
  ])

  const r = positionsAtEnd([], 3)
  addGroup(research!.id, r[0]!, '🔐', 'Self-hosting', [
    { link: 'https://caddyserver.com/docs/', title: 'Caddy Documentation' },
    { link: 'https://docs.docker.com/compose/', title: 'Docker Compose overview' },
    { link: 'https://www.sqlite.org/backup.html', title: 'SQLite Backup API' },
    { link: 'https://letsencrypt.org/docs/', title: "Let's Encrypt – Documentation" },
  ])
  addGroup(research!.id, r[1]!, '🧩', 'Extensions', [
    { link: 'https://developer.chrome.com/docs/extensions', title: 'Chrome Extensions' },
    { link: 'https://wxt.dev/', title: 'WXT – Next-gen Web Extension Framework' },
    { link: 'https://dexie.org/', title: 'Dexie.js – Minimalistic IndexedDB Wrapper' },
    { link: 'https://dndkit.com/', title: 'dnd kit – a modern drag and drop toolkit' },
  ])
  addGroup(research!.id, r[2]!, '🎨', 'Inspiration', [
    { link: 'https://linear.app/', title: 'Linear – Plan and build products' },
    { link: 'https://www.raycast.com/', title: 'Raycast – Your shortcut to everything' },
    { link: 'https://arc.net/', title: 'Arc from The Browser Company' },
  ])

  addGroup(homeCat.id, 'a0', '🧳', 'Lisbon', [
    { link: 'https://www.google.com/maps', title: 'Google Maps' },
    { todo: 'Book the train' },
  ])

  const demo = bundle.items.find((i) => i.text === 'Record a 30-second demo')!
  const forum = bundle.items.find((i) => i.text === 'Post on the forum')!
  const day = new Date(now)
  const at = (days: number, hour: number, minute = 0) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate() + days, hour, minute).getTime()
  const morning = at(0, 9, 30)
  bundle.reminders.push(
    makeReminder({ itemId: demo.id, dueAt: morning < now ? morning : now - 20 * 60_000 }, clock),
    makeReminder({ itemId: forum.id, dueAt: at(1, 10) }, clock),
  )
  return bundle
}
