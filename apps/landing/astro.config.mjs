// @ts-check
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// Set SITE_URL to the real address when deploying (used for canonical links, Open Graph and the sitemap).
const site = process.env.SITE_URL ?? 'https://tabs.example.com'

export default defineConfig({
  site,
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  vite: {
    plugins: [tailwindcss()],
    server: { fs: { allow: ['../..'] } },
  },
  build: { inlineStylesheets: 'always' },
})
