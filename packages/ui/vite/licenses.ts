import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Vite plugin that writes the license of every third-party package that ends up in the
 * shipped files (scripts, styles, fonts) to `third-party-licenses.txt` in the output folder.
 *
 * WXT and Astro run several builds into one folder, so packages are collected across builds
 * and the file is rewritten after each one. Builds that do not ship code to the browser
 * (Astro's prerender step) only contribute the assets they emit, such as fonts.
 */
export function thirdPartyLicenses({
  product,
  extraFiles = [],
}: {
  product: string
  /** Files shipped without going through the bundle, e.g. copied JSON data. */
  extraFiles?: string[]
}) {
  let outDir = ''
  extraFiles.forEach(add)
  return {
    name: 'tabhangar:third-party-licenses',
    apply: 'build' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = resolve(config.root, config.build.outDir)
    },
    generateBundle(this: BuildContext, _options: unknown, bundle: Record<string, BundleItem>) {
      const shipsCode = !this.environment || this.environment.name === 'client'
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          if (shipsCode) for (const id of item.moduleIds ?? Object.keys(item.modules ?? {})) add(id)
        } else {
          for (const file of item.originalFileNames ?? []) add(file)
        }
      }
    },
    closeBundle(this: BuildContext) {
      if (this.environment && this.environment.name !== 'client') return
      writeFileSync(join(outDir, 'third-party-licenses.txt'), render(product))
    },
  }
}

interface BuildContext {
  environment?: { name: string }
}

type BundleItem =
  | { type: 'chunk'; moduleIds?: string[]; modules?: Record<string, unknown> }
  | { type: 'asset'; originalFileNames?: string[] }

interface Found {
  name: string
  version: string
  license: string
  text: string
}

const found = new Map<string, Found>()

/** Records the package a bundled file comes from (files outside node_modules are ours). */
function add(file: string) {
  const path = file.replace(/^\0/, '').split('?')[0]!.replaceAll('\\', '/')
  const at = path.lastIndexOf('/node_modules/')
  if (at < 0) return
  const [scope, name] = path.slice(at + '/node_modules/'.length).split('/')
  const root = `${path.slice(0, at)}/node_modules/${scope!.startsWith('@') ? `${scope}/${name}` : scope}`
  if (found.has(root)) return
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    name: string
    version: string
    license?: string
  }
  const licenseFile = readdirSync(root).find((entry) =>
    /^(licen[cs]e|copying)(\.|-|$)/i.test(entry),
  )
  found.set(root, {
    name: pkg.name,
    version: pkg.version,
    license: pkg.license ?? 'see the text below',
    text: licenseFile ? readFileSync(join(root, licenseFile), 'utf8').trim() : '',
  })
}

function render(product: string): string {
  const line = '='.repeat(72)
  const entries = [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
  const sections = entries.map(
    (entry) =>
      `${line}\n${entry.name} ${entry.version} (${entry.license})\n${line}\n\n${entry.text || `Licensed under ${entry.license}.`}\n`,
  )
  return `${product} includes the following third-party software.\n\n${sections.join('\n')}`
}
