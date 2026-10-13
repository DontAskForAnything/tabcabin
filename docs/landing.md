# Landing page

`apps/landing` is a static Astro site: the home page, `/self-hosted-tab-manager`, comparison pages under
`/alternatives/`, the privacy policy (`/privacy`, needed for the Chrome Web Store listing), a sitemap
and `robots.txt`. It has no server-side code, so any static host works.

## Drawings

The forest scenes are inline SVG generated at build time, so no drawing code reaches the browser:

- `src/lib/landscape.ts` — seeded random numbers, ground lines, spruces, forests, mountains,
  stars; `src/lib/contours.ts` — contour lines.
- `src/components/scene/` — `Valley` and `Sky` (home page header), `Cabin`, `Contours`
  (self-hosting section), `Etching` (above the footer, `<Footer scenery={false} />` turns it
  off), `LostTrail` and `TabSign` (404).
- `src/styles/scene.css` — the day and night colours (registered custom properties, so a theme
  switch animates) and the small animations, which start after the page has loaded.

See "Illustrations" in [brand.md](brand.md) for the rules.

## Build

```bash
pnpm install
SITE_URL=https://tabcabin.example.com pnpm --filter @tabcabin/landing build
# → apps/landing/dist
```

`SITE_URL` is the address the site will live at. It is used for canonical links, Open Graph tags,
structured data, the sitemap and `robots.txt`, so set it for every production build. The address is
never written into the code: without `SITE_URL` the build uses the placeholder
`https://tabs.example.com`.

Two more addresses switch the site from "coming soon" to released, each on its own:

| Variable        | When set                                                              | When empty                                 |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `EXTENSION_URL` | "Get it for Chrome" buttons go there (the store listing or a release) | the buttons say "Coming soon to Chrome"    |
| `REPO_URL`      | GitHub links in the menu, hero, footer, privacy page and the terminal | no GitHub links (for a private repository) |

To build on GitHub, add `SITE_URL` once as a repository variable (**Settings → Secrets and variables →
Actions → Variables**), with `EXTENSION_URL` and `REPO_URL` when they exist, and run **Actions →
Build → Run workflow**: the built site (and the extension zip, with `WXT_SYNC_SERVER` and this
address for its Settings link) is attached to the run as a download. The **Pages** workflow below
uses the same variables (`SITE_URL` only when you leave its address field empty).

Preview locally with `pnpm --filter @tabcabin/landing preview`.

## Option A — Caddy on your server

If the sync server already runs behind Caddy (see [self-hosting.md](self-hosting.md)), the same Caddy
can serve the site:

```bash
SITE_URL=https://tabcabin.example.com pnpm --filter @tabcabin/landing build
rsync -a --delete apps/landing/dist/ you@server:/srv/tabcabin-site/
```

Add the block from [`deploy/Caddyfile.landing.example`](../deploy/Caddyfile.landing.example) for your domain
(or merge it into `deploy/Caddyfile` and mount `/srv/tabcabin-site` into the `caddy` container), then
reload Caddy. It compresses responses, caches fingerprinted assets for a year and serves the 404 page.

## Option B — GitHub Pages

1. Make the repository public (or use a plan that allows Pages for private repositories).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions → Pages → Run workflow**, enter the site address (for example
   `https://dontaskforanything.github.io/tabcabin` or your custom domain), or leave it empty to use
   the `SITE_URL` repository variable.

The workflow ([`.github/workflows/pages.yml`](../.github/workflows/pages.yml)) only runs when started
by hand. For a custom domain, add it under **Settings → Pages** and point a `CNAME` record at
`dontaskforanything.github.io`.

## Option C — other static hosts

Netlify, Cloudflare Pages and similar: build command
`pnpm --filter @tabcabin/landing build`, output directory `apps/landing/dist`, environment variable
`SITE_URL` (and `EXTENSION_URL`, `REPO_URL`).

## Option D — a container (Coolify and other Docker hosts)

[`apps/landing/Dockerfile`](../apps/landing/Dockerfile) builds the site and serves it with Caddy on
port 80: compressed, fingerprinted assets cached for a year, and the 404 page. The proxy in front of
it adds HTTPS. The addresses are build arguments:

```bash
docker build -f apps/landing/Dockerfile --build-arg SITE_URL=https://tabcabin.example.com -t tabcabin-site .
docker run -d -p 8080:80 tabcabin-site
```

In Coolify, add the repository as a new application (a private one through the GitHub App) with:

- build pack **Dockerfile**, base directory `/`, Dockerfile location `/apps/landing/Dockerfile`
- exposed port `80` and your domain
- `SITE_URL` (the same address), `EXTENSION_URL` and `REPO_URL` as environment variables available
  at build time
- optionally watch paths `apps/landing/**`, `packages/ui/**` and `docs/screenshots/**`, so only
  changes to the site start a new deployment

## After the first deploy

- Put `https://<your-site>/privacy/` into the Chrome Web Store listing (see
  [chrome-web-store/README.md](chrome-web-store/README.md)).
- Add the site to Google Search Console: a **Domain** property verified with a DNS TXT record
  covers `www` and every subdomain. Then submit `https://<your-site>/sitemap-index.xml` under
  **Sitemaps**.
- Check the social preview with a link-preview tool; the image is `public/og.png`.
- Set `EXTENSION_URL` to the store listing once it is live, and `REPO_URL` once the repository is
  public, then build the site again.
