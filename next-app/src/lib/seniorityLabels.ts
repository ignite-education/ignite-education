import type { Seniority } from '@/data/jobsData'

/** The board's three levels, in career order. */
export const SENIORITY_LEVELS: Seniority[] = ['entry', 'mid', 'senior']

export const SENIORITY_LABELS: Record<Seniority, string> = {
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
}

/** Shorter form for the tight badge on a job card. */
export const SENIORITY_SHORT: Record<Seniority, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
}

export function seniorityLabel(value: string): string {
  return SENIORITY_LABELS[value as Seniority] || value
}

/** Sort key so "entry" sorts before "senior" rather than alphabetically. */
export function seniorityOrder(value: string): number {
  const index = SENIORITY_LEVELS.indexOf(value as Seniority)
  return index === -1 ? SENIORITY_LEVELS.length : index
}

/**
 * "£45,000 – £55,000 a year" from the stored parts.
 * Returns null when there is nothing meaningful to show, so callers can simply
 * omit the row rather than rendering an empty label.
 */
export function formatSalary({
  min,
  max,
  currency,
  period,
}: {
  min: number | null
  max: number | null
  currency: string | null
  period: string | null
}): string | null {
  if (min == null && max == null) return null

  const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' }
  const symbol = symbols[currency || 'GBP'] || ''

  // Hourly and daily rates need their pence; annual salaries do not.
  const fine = period === 'hour' || period === 'day'
  const fmt = (n: number) =>
    `${symbol}${n.toLocaleString('en-GB', {
      minimumFractionDigits: fine && n % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: fine ? 2 : 0,
    })}`

  const amount = min != null && max != null && max !== min
    ? `${fmt(min)} – ${fmt(max)}`
    : fmt((min ?? max) as number)

  const suffix: Record<string, string> = {
    year: ' a year',
    month: ' a month',
    week: ' a week',
    day: ' a day',
    hour: ' an hour',
  }

  return `${amount}${period ? suffix[period] || '' : ''}`
}

// Spelt out rather than left to toLocaleDateString: /jobs is prerendered and
// then hydrated, so the server and the browser must agree to the character, and
// Node's bundled ICU need not match the visitor's browser. Full month names are
// the stable case — it is the abbreviations that drift, where recent en-GB CLDR
// gives "Sept" and older gives "Sep" — but a literal array costs nothing and
// takes the question off the table entirely. There is no locale data for the
// ordinal suffix at all, so that has to be written out regardless.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** 1st, 2nd, 3rd, 4th … and the 11th/12th/13th exceptions that break the rule. */
function ordinal(day: number): string {
  const suffix =
    day >= 11 && day <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th'
  return `${day}${suffix}`
}

/**
 * "6hrs ago" · "2 days ago" · "24th July" — job recency is the thing users
 * scan for hardest.
 *
 * Three bands, and the last boundary is the one that matters: past three days a
 * listing has stopped being news, and a date answers "how stale is this?" more
 * usefully than "3 weeks ago" did. It also survives caching, which the relative
 * forms do not — /jobs is prerendered on a five-minute ISR window and served
 * stale beyond it, so every relative label is already out of date in the HTML
 * by the time it is read. Most of the board now renders a date that cannot
 * drift at all.
 *
 * Dates carry the year once they are not from this one. The board really does
 * hold them: several ATS feeds report the requisition's creation date rather
 * than the advert's, so there are live listings stamped 2019, and a bare
 * "29 Jan" on one of those would read as a fortnight ago.
 */
export function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null

  // Clamped rather than special-cased: a source clock running fast should read
  // as new, not as "in 2 hours".
  const hours = Math.max(0, Math.floor((Date.now() - then.getTime()) / 3_600_000))

  if (hours < 24) {
    // Floors to 1, so a listing minutes old reads "1hr ago" rather than "0hrs
    // ago". Erring old is the safe direction — it never claims fresher than the
    // advert is. Worth knowing that a few ATS feeds only report a date, which
    // arrives as midnight UTC, so their first day counts hours from midnight
    // rather than from the posting.
    const h = Math.max(1, hours)
    return `${h}hr${h === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(hours / 24)
  if (days <= 3) return `${days} day${days === 1 ? '' : 's'} ago`

  // UTC on both sides of the hydration boundary. The alternative — local time —
  // would have the prerender (UTC on Vercel) and the visitor's browser disagree
  // about the day for anything posted near midnight.
  const date = `${ordinal(then.getUTCDate())} ${MONTHS[then.getUTCMonth()]}`
  return then.getUTCFullYear() === new Date().getUTCFullYear()
    ? date
    : `${date} ${then.getUTCFullYear()}`
}
