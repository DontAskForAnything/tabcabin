import { createRequire } from 'node:module'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

const require = createRequire(import.meta.url)
const EMOJI_LOCALES = ['en', 'pl'] as const

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  hooks: {
    // Ship emoji data with the extension so the picker works offline.
    'build:publicAssets': (_wxt, files) => {
      for (const locale of EMOJI_LOCALES) {
        for (const file of ['data', 'messages']) {
          files.push({
            absoluteSrc: require.resolve(`emojibase-data/${locale}/${file}.json`),
            relativeDest: `emoji/${locale}/${file}.json`,
          })
        }
      }
    },
  },
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: [
      'tabs',
      'tabGroups',
      'storage',
      'unlimitedStorage',
      'contextMenus',
      'favicon',
      'alarms',
      'sidePanel',
      'activeTab',
      'scripting',
    ],
    optional_permissions: ['bookmarks', 'topSites', 'notifications'],
    action: {
      default_title: 'TabHangar',
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
        description: '__MSG_cmdSaveCurrentPage__',
      },
    },
  },
})
