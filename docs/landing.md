# Landing page

`apps/landing` is a static Astro site: the home page, `/self-hosted-tab-manager`, comparison pages under
`/alternatives/`, the privacy policy (`/privacy`, needed for the Chrome Web Store listing), a sitemap
and `robots.txt`. It has no server-side code, so any static host works.

## Build

```bash
pnpm install
SITE_URL=https://tabhangar.example.com pnpm --filter @tabcabin/landing build
# → apps/landing/dist
```

`SITE_URL` is the address the site will live at. It is used for canonical links, Open Graph tags,
structured data, the sitemap and `robots.txt`, so set it for every production build.

Preview locally with `pnpm --filter @tabcabin/landing preview`.

## Option A — Caddy on your server

If the sync server already runs behind Caddy (see [self-hosting.md](self-hosting.md)), the same Caddy
can serve the site:

```bash
SITE_URL=https://tabhangar.example.com pnpm --filter @tabcabin/landing build
rsync -a --delete apps/landing/dist/ you@server:/srv/tabhangar-site/
```

Add the block from [`deploy/Caddyfile.landing.example`](../deploy/Caddyfile.landing.example) for your domain
(or merge it into `deploy/Caddyfile` and mount `/srv/tabhangar-site` into the `caddy` container), then
reload Caddy. It compresses responses, caches fingerprinted assets for a year and serves the 404 page.

## Option B — GitHub Pages

1. Make the repository public (or use a plan that allows Pages for private repositories).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions → Pages → Run workflow**, enter the site address (for example
   `https://dontaskforanything.github.io/tabhangar` or your custom domain).

The workflow ([`.github/workflows/pages.yml`](../.github/workflows/pages.yml)) only runs when started
by hand. For a custom domain, add it under **Settings → Pages** and point a `CNAME` record at
`dontaskforanything.github.io`.

## Option C — other static hosts

Netlify, Cloudflare Pages and similar: build command
`pnpm --filter @tabcabin/landing build`, output directory `apps/landing/dist`, environment variable
`SITE_URL`.

## After the first deploy

- Put `https://<your-site>/privacy` into the Chrome Web Store listing (see
  [chrome-web-store/README.md](chrome-web-store/README.md)).
- Add the site to Google Search Console and submit `https://<your-site>/sitemap-index.xml`.
- Check the social preview with a link-preview tool; the image is `public/og.png`.
- Point the "Get it for Chrome" buttons at the store listing once it is live (`releases` in
  `apps/landing/src/site.ts`).
