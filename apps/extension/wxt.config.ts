import { createRequire } from 'node:module'
import { thirdPartyLicenses } from '@tabcabin/ui/vite/licenses'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

const require = createRequire(import.meta.url)
const EMOJI_LOCALES = ['en', 'pl'] as const
const OPTIONAL_PERMISSIONS = ['bookmarks', 'topSites', 'notifications', 'identity']

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  zip: {
    artifactTemplate: 'tabcabin-{{version}}-{{browser}}.zip',
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      thirdPartyLicenses({
        product: 'TabCabin',
        extraFiles: [require.resolve('emojibase-data/package.json')],
      }),
    ],
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
  manifest: ({ mode }) => ({
    // The store shows this name as the title; Chrome uses the short one where space is tight.
    name: '__MSG_extName__',
    short_name: '__MSG_extShortName__',
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
      ...(mode === 'e2e' ? OPTIONAL_PERMISSIONS : []),
    ],
    optional_permissions: mode === 'e2e' ? [] : OPTIONAL_PERMISSIONS,
    // Link checks read every saved site; asked for only when they are turned on.
    ...(mode === 'e2e' ? {} : { optional_host_permissions: ['<all_urls>'] }),
    action: {
      default_title: 'TabCabin',
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
        description: '__MSG_cmdSaveCurrentPage__',
      },
      // Not Option on a Mac: Option+Shift+S types a letter on some keyboards (Polish: Ś).
      'save-to-inbox': {
        suggested_key: { default: 'Alt+Shift+S', mac: 'MacCtrl+Shift+S' },
        description: '__MSG_cmdSaveToInbox__',
      },
    },
    // End-to-end tests can't produce user gestures (activeTab, permission prompts), so the test
    // build may script any page and has the optional permissions granted up front.
    ...(mode === 'e2e' ? { host_permissions: ['<all_urls>'] } : {}),
  }),
})
