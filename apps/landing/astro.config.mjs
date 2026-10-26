// @ts-check
import sitemap from '@astrojs/sitemap'
import { thirdPartyLicenses } from '@tabcabin/ui/vite/licenses'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { createRequire } from 'node:module'

// Set SITE_URL to the real address when deploying (used for canonical links, Open Graph and the sitemap).
const site = process.env.SITE_URL || 'https://tabs.example.com'

export default defineConfig({
  site,
  // Pages live in folders (/privacy/), so every link and canonical address ends with a slash.
  trailingSlash: 'always',
  // The goodbye page opens only when the extension is removed.
  integrations: [sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/bye/') })],
  vite: {
    plugins: [
      tailwindcss(),
      thirdPartyLicenses({
        product: 'The TabCabin website',
        // Icons are inlined into the HTML at build time and motion only re-exports its parts, so
        // neither shows up in the client bundle on its own.
        extraFiles: ['lucide-static', 'motion'].map((name) =>
          createRequire(import.meta.url).resolve(`${name}/package.json`),
        ),
      }),
    ],
    server: { fs: { allow: ['../..'] } },
  },
  build: { inlineStylesheets: 'always' },
})
