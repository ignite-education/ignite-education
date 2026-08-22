/**
 * Site-wide constants and metadata helpers.
 *
 * Two-tier rule for URLs — this matters:
 *
 *  - In `Metadata` objects (alternates.canonical, openGraph.url, images, …) use
 *    RELATIVE paths. `metadataBase` in app/layout.tsx resolves them against
 *    SITE_URL, so the apex host lives in exactly one place.
 *  - In JSON-LD, `metadataBase` does NOT apply. Those must stay absolute, so
 *    build them from SITE_URL.
 */

export const SITE_URL = 'https://ignite.education'
export const SITE_NAME = 'Ignite Education'

/**
 * The brand as it appears in a <title> suffix — deliberately shorter than
 * SITE_NAME. These are two different things and must not be collapsed:
 *
 *  - SITE_NAME is the ENTITY. It is schema.org Organization.name, og:site_name
 *    and applicationName. Renaming it re-points the entity Google has been
 *    consolidating towards a Knowledge Panel; the legal name is ORG_LEGAL_NAME.
 *  - BRAND_SUFFIX is DISPLAY CHROME on the end of a page title, where every
 *    character competes with the descriptive part for ~580px of SERP width.
 *
 * If you are about to "fix" the inconsistency by making these equal: don't.
 */
export const BRAND_SUFFIX = 'Ignite'

/** Stable @id anchors so every JSON-LD block references one shared entity. */
export const ORG_ID = `${SITE_URL}/#organization`
export const SITE_ID = `${SITE_URL}/#website`
export const LOGO_ID = `${SITE_URL}/#logo`

/**
 * Self-hosted from the ROOT public/ dir, same rule as DEFAULT_OG_IMAGE below.
 * Must NOT point at Supabase storage: that origin responds `x-robots-tag: none`,
 * so a logo hosted there is noindex and can never reach a Knowledge Panel —
 * Google requires the Organization logo to be crawlable *and* indexable.
 * Flattened onto white, since Google expects it to render on a white surface.
 */
export const ORG_LOGO = `${SITE_URL}/ignite-logo.png`

export const ORG_EMAIL = 'hello@ignite.education'
export const ORG_LEGAL_NAME = 'Ignite Education AI Ltd.'

export const SAME_AS = [
  'https://www.linkedin.com/school/ignite-courses',
  'https://www.reddit.com/user/ignite-education',
]

/** Default social card. Served from the ROOT public/ dir (see docs/ARCHITECTURE.md). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

/**
 * Open Graph fields every page should carry.
 *
 * Next.js *replaces* rather than merges the `openGraph` object across the
 * layout/page boundary, so defaults declared in app/layout.tsx do NOT reach any
 * page that declares its own `openGraph`. Spread this into each page's
 * openGraph instead of relying on inheritance.
 */
export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: 'en_GB',
} as const

/**
 * Build an Open Graph images array, falling back to the site default.
 * Explicit width/height save LinkedIn and Facebook a blocking fetch to infer them.
 */
export function ogImages(custom?: string | null) {
  return [{ url: custom || DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }]
}

export const GA_MEASUREMENT_ID = 'G-FH4CYRKWME'

/**
 * Strip a trailing "| Ignite" / "— Ignite Education" suffix.
 *
 * The root layout applies the `%s | Ignite` title template, so any title that
 * already carries the brand renders double- or triple-branded. Some brand
 * suffixes come from DB columns (blog_posts.meta_title), so this has to be
 * defensive rather than a one-off literal edit. Both the long and short brand
 * are matched, because titles saved before the suffix shortened still carry
 * "Ignite Education".
 */
export function stripBrand(title: string): string {
  return title.replace(/\s*[|–—-]\s*Ignite(\s+Education)?\s*$/i, '').trim()
}

/**
 * Brand a title for og:title / twitter:title.
 *
 * Those two get no template — Next only templates <title> — so they have to
 * append the brand by hand, and hand-appended literals drift: this site
 * simultaneously carried "| Ignite Education", "— Ignite Education" and
 * "| Ignite Prompt Toolkit" on pages whose <title> said none of those things.
 * Pass the exact string given to `metadata.title` and the social card cannot
 * disagree with the search result.
 *
 * stripBrand() first, because some titles come from DB columns editors
 * sometimes save pre-branded.
 */
export function brandTitle(title: string): string {
  return `${stripBrand(title)} | ${BRAND_SUFFIX}`
}

/**
 * Truncate on a word boundary with an ellipsis, instead of slicing mid-word.
 * `"...decisions across organisa"` was shipping to SERPs before this existed.
 */
export function truncateAtWord(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.–—-]+$/, '') + '…'
}
