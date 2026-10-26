/** Pages of the project the extension links to. */
const REPOSITORY = 'https://github.com/DontAskForAnything/tabcabin'

export const SELF_HOSTING_DOCS = `${REPOSITORY}/blob/main/docs/self-hosting.md`

/**
 * The website, set when building (WXT_SITE_URL in apps/extension/.env; the GitHub "Build" workflow
 * fills it from the SITE_URL variable). Builds without it link to the project on GitHub.
 */
export const WEBSITE = import.meta.env.WXT_SITE_URL || REPOSITORY

/** Opened by the browser when TabCabin is removed; builds without a website open nothing. */
export const GOODBYE_PAGE = import.meta.env.WXT_SITE_URL
  ? new URL('/bye/', import.meta.env.WXT_SITE_URL).href
  : null
