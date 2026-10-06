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
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  vite: {
    plugins: [
      tailwindcss(),
      thirdPartyLicenses({
        product: 'The TabHangar website',
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
