import { professionToSlug } from './professionUtils'

/**
 * The per-job URL contract: `/jobs/{professionSlug}/{title-slug}-{shortId}`.
 *
 * No slug column. The URL is derived from columns the listing already has, and
 * the only part that has to RESOLVE is the eight-hex-character id suffix —
 * jobsData.getJobByShortId() looks that up with a range query on the uuid
 * primary key. The title part is for people and for Google; if it drifts (the
 * employer retitles the advert, an admin re-professions it) the page 308s to
 * the current path, so every URL ever emitted keeps working.
 *
 * Mirrored in server/jobs/lib/googleIndexing.js, which has to build the same
 * URL to announce it to Google and shares no imports with this app. The two
 * are documented against each other the way MAX_POSTED_AGE_DAYS is; change
 * both together.
 */

export const SHORT_ID_LEN = 8

/** Mirrors slugify() in shared/jobs/companyKey.js and public.slugify() in SQL. */
export function slugifyTitle(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function jobSlug(title: string, id: string): string {
  return `${slugifyTitle(title) || 'job'}-${id.slice(0, SHORT_ID_LEN)}`
}

/**
 * The canonical path for a listing, or null when it has no profession. The
 * ingest cascade drops jobs it cannot map to a profession before they become
 * rows, so null is a guard rather than a state the board is expected to hold —
 * but the column is nullable, and a page under `/jobs/undefined/...` is worse
 * than no page.
 */
export function jobPath(job: { id: string; title: string; profession: string | null }): string | null {
  if (!job.profession) return null
  return `/jobs/${professionToSlug(job.profession)}/${jobSlug(job.title, job.id)}`
}

const SHORT_ID_RE = new RegExp(`-?([0-9a-f]{${SHORT_ID_LEN}})$`)

/** The id suffix of a slug, or null when the slug cannot be one of ours. */
export function parseJobSlug(slug: string): string | null {
  const match = SHORT_ID_RE.exec(slug)
  return match ? match[1] : null
}
