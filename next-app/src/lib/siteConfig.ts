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

/** Stable @id anchors so every JSON-LD block references one shared entity. */
export const ORG_ID = `${SITE_URL}/#organization`
export const SITE_ID = `${SITE_URL}/#website`
export const LOGO_ID = `${SITE_URL}/#logo`

export const ORG_LOGO =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png'

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
 * The root layout applies the `%s | Ignite Education` title template, so any
 * title that already carries the brand renders double- or triple-branded.
 * Some brand suffixes come from DB columns (blog_posts.meta_title), so this
 * has to be defensive rather than a one-off literal edit.
 */
export function stripBrand(title: string): string {
  return title.replace(/\s*[|–—-]\s*Ignite(\s+Education)?\s*$/i, '').trim()
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
