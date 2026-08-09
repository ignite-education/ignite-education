import { createClient } from '@supabase/supabase-js'
import { professionToSlug } from '@/lib/professionUtils'

export type Seniority = 'entry' | 'mid' | 'senior'

export type Job = {
  id: string
  title: string
  company: string
  companyLogoUrl: string | null
  snippet: string
  profession: string
  professionSlug: string
  seniority: Seniority
  location: string | null
  locationCity: string | null
  isRemote: boolean
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  salaryIsEstimate: boolean
  contractType: string | null
  postedAt: string | null
  displaySource: string
}

export type JobSourceAttribution = {
  key: string
  name: string
  attribution: {
    required?: boolean
    label?: string
    logoUrl?: string
    logoMinWidth?: number
    logoMinHeight?: number
    linkUrl?: string
    perAdvert?: boolean
    salaryEstimate?: { iconUrl?: string; minSize?: number; title?: string }
    forbidsDerivedStats?: boolean
  }
}

/**
 * Ship at most this many rows to the browser.
 *
 * The board filters client-side in a useMemo, exactly like /prompts — that keeps
 * filtering instant and the code simple. But /prompts ships EVERY row, which is
 * fine at ~100 prompts and a real payload problem at a few thousand jobs. 300
 * rows of the columns below is roughly 120KB, and filtering 300 rows in memory
 * is imperceptible. If the board ever outgrows this, add a search endpoint —
 * do not simply raise the cap.
 */
const MAX_BOARD_ROWS = 300

/**
 * Hide anything posted longer ago than this.
 *
 * Duplicated from MAX_POSTED_AGE_DAYS in server/jobs/lib/expire.js — the two
 * packages share no imports, and the API reads it from JOBS_MAX_POSTED_AGE_DAYS
 * which does not reach this deploy. That copy carries the reasoning, the
 * measured cost and the warning to read before tuning. Change both together.
 *
 * What makes the duplication tolerable is that drift always resolves to the
 * tighter of the two: a wider value here still only sees rows the sweep left
 * approved, and a wider value there is filtered out by this query. Neither
 * direction can leak a stale listing onto the board.
 *
 * Belt and braces, and worth having as both: the nightly sweep expires these
 * rows so RLS stops returning them at all, but it only runs once a day. This
 * cut applies at read time, so a listing crosses the threshold on the next ISR
 * revalidation rather than at the next ingest.
 */
const MAX_POSTED_AGE_DAYS = 45

/**
 * PostgREST `or` clause for "posted recently, or undated".
 *
 * Undated listings stay. A plain `.gte()` would drop them, and "older than
 * three weeks" is not something we know about a row with no posted_at —
 * delisting is what retires those.
 *
 * Every public read of job_listings must apply this, not just the board query.
 * getProfessionsWithJobs decides which profession pages are indexed and which
 * reach the sitemap, so counting listings the board will not show would
 * advertise empty pages to Google.
 */
function freshnessFilter(): string {
  const after = new Date(Date.now() - MAX_POSTED_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  return `posted_at.is.null,posted_at.gte.${after}`
}

/**
 * The columns the public board is allowed to read.
 *
 * Explicit, never select('*'):
 *  - description_text is deliberately absent. It is up to 40KB per row, and no
 *    page reads it: the card shows a precomputed summary of it and Apply goes
 *    straight to the employer's own advert, so the full text is never needed
 *    here. server/jobs/lib/summarise.js is the only thing that reads it.
 *  - both ai_summary and description_snippet are selected. The first is what
 *    the card shows; the second is the fallback for anything not summarised
 *    yet, and costs nothing extra since it is ~300 characters either way.
 *  - there is no apply-URL column to omit — apply URLs live in a separate table
 *    with no anon policy. See migrations/create_job_board_tables.sql.
 */
const BOARD_COLUMNS = `
  id, title, company, company_logo_url, ai_summary, description_snippet,
  profession, seniority, location_raw, location_city, is_remote,
  salary_min, salary_max, salary_currency, salary_period, salary_is_estimate,
  contract_type, posted_at, display_source
`

/** Cookie-less client so pages stay statically renderable / ISR-cacheable. */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapDbJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyLogoUrl: row.company_logo_url ?? null,
    // The AI summary when there is one, else the 300-character truncation the
    // ingest always writes. This fallback is the whole rollout strategy: every
    // listing renders from the moment the column exists, summaries light up as
    // the nightly cron works through them, and a failed summarisation degrades
    // to exactly today's output rather than an empty card.
    snippet: row.ai_summary || row.description_snippet || '',
    profession: row.profession,
    professionSlug: professionToSlug(row.profession || ''),
    seniority: (row.seniority || 'mid') as Seniority,
    location: row.location_raw ?? null,
    locationCity: row.location_city ?? null,
    isRemote: Boolean(row.is_remote),
    salaryMin: row.salary_min ?? null,
    salaryMax: row.salary_max ?? null,
    salaryCurrency: row.salary_currency ?? null,
    salaryPeriod: row.salary_period ?? null,
    salaryIsEstimate: Boolean(row.salary_is_estimate),
    contractType: row.contract_type ?? null,
    postedAt: row.posted_at ?? null,
    displaySource: row.display_source,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Approved, unexpired, recently-posted listings for a market.
 *
 * RLS already restricts anon reads to approved + unexpired rows, so the filters
 * here are about freshness, ordering and payload size rather than access
 * control.
 */
export async function getJobs({
  market = 'gb',
  profession = null,
  limit = MAX_BOARD_ROWS,
}: { market?: string; profession?: string | null; limit?: number } = {}): Promise<Job[]> {
  const supabase = getSupabase()

  let query = supabase
    .from('job_listings')
    .select(BOARD_COLUMNS)
    .eq('market', market)
    .or(freshnessFilter())
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (profession) query = query.eq('profession', profession)

  const { data, error } = await query
  if (error) {
    console.error('Error fetching jobs:', error)
    return []
  }
  return (data || []).map(mapDbJob)
}

/**
 * Attribution metadata per source, keyed by source key.
 *
 * Aggregators REQUIRE a badge on every advert — typically a logo at a stated
 * minimum pixel size, with API access suspended for non-compliance. No ATS
 * source requires anything, which is why most cards render nothing here.
 * Cards read this via the listing's display_source (not source: a cross-source
 * dedupe can elect a different canonical).
 */
export async function getSourceAttribution(): Promise<Record<string, JobSourceAttribution>> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('job_sources').select('key, name, attribution')

  if (error) {
    console.error('Error fetching job source attribution:', error)
    return {}
  }

  const map: Record<string, JobSourceAttribution> = {}
  for (const row of data || []) {
    map[row.key] = { key: row.key, name: row.name, attribution: row.attribution || {} }
  }
  return map
}

/**
 * Professions that actually have live listings.
 *
 * The board only offers filters that lead somewhere, and only sitemaps
 * profession pages with inventory — a thin empty page is an SEO liability.
 */
export async function getProfessionsWithJobs(market = 'gb'): Promise<string[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('job_listings')
    .select('profession')
    .eq('market', market)
    .or(freshnessFilter())
    .limit(2000)

  if (error) {
    console.error('Error fetching professions with jobs:', error)
    return []
  }
  return [...new Set((data || []).map(r => r.profession).filter(Boolean))]
}
