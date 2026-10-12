import { createClient } from '@supabase/supabase-js'
import { professionToSlug } from '@/lib/professionUtils'
import { jobPath } from '@/lib/jobSlug'

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
  /**
   * The listing's own page, `/jobs/{profession}/{title}-{id8}`, or null when
   * the row has no profession. Computed server-side (lib/jobSlug.ts) so client
   * components can link without knowing the contract.
   */
  path: string | null
}

/**
 * Everything the per-job page needs on top of a board row. Read one row at a
 * time, never for the list — see JOB_PAGE_COLUMNS.
 */
export type JobDetail = Job & {
  descriptionText: string | null
  locationRegion: string | null
  countryCode: string | null
  contractTime: string | null
  /** The ingest source key — gates JobPosting markup via job_sources.allow_jobposting. */
  source: string
  expiresAt: string | null
  firstSeenAt: string
  approvedAt: string | null
}

export type JobSourceAttribution = {
  key: string
  name: string
  /**
   * Whether listings from this source may carry JobPosting JSON-LD, appear in
   * the sitemap and be announced to Google. False for aggregator feeds whose
   * terms forbid redistribution. See migrations/add_job_posting_pages.sql.
   */
  allowJobPosting: boolean
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
export const MAX_POSTED_AGE_DAYS = 45

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
 *    LIST reads it: the card shows a precomputed summary of it and Apply goes
 *    straight to the employer's own advert. The two places that do read it —
 *    the detail pane (lib/jobDescription.ts) and the per-job page
 *    (JOB_PAGE_COLUMNS below) — fetch exactly one row each.
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

/**
 * The per-job page's columns: a board row plus the advert and the facts
 * JobPosting markup needs. One row per request, so the payload argument
 * against description_text does not apply.
 *
 * NEVER add `canonical_url` or `source_job_id` here. Both carry the employer's
 * advert URL (the jsonld adapter stores `{board}:{advert URL}` as the job id),
 * which is the thing the sign-in gate exists to withhold. Anon RLS is
 * row-level, not column-level — the only protection is not asking.
 */
const JOB_PAGE_COLUMNS = `
  ${BOARD_COLUMNS},
  description_text, location_region, country_code, contract_time,
  source, expires_at, first_seen_at, approved_at
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
    path: jobPath(row),
  }
}

function mapDbJobDetail(row: any): JobDetail {
  return {
    ...mapDbJob(row),
    descriptionText: row.description_text ?? null,
    locationRegion: row.location_region ?? null,
    countryCode: row.country_code ?? null,
    contractTime: row.contract_time ?? null,
    source: row.source,
    expiresAt: row.expires_at ?? null,
    firstSeenAt: row.first_seen_at,
    approvedAt: row.approved_at ?? null,
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
  let result = await supabase
    .from('job_sources')
    .select('key, name, attribution, allow_jobposting')

  // Deploy-order safety. allow_jobposting arrived with
  // migrations/add_job_posting_pages.sql; if this build reaches production
  // before that is applied, the select fails on the unknown column (42703)
  // and every source badge — a contractual requirement for aggregators —
  // would vanish from the board. Retry without it and treat every source as
  // allowed, which is the pre-migration behaviour.
  if (result.error?.code === '42703') {
    console.warn('job_sources.allow_jobposting is missing — apply migrations/add_job_posting_pages.sql')
    result = await supabase.from('job_sources').select('key, name, attribution')
  }

  if (result.error) {
    console.error('Error fetching job source attribution:', result.error)
    return {}
  }

  const map: Record<string, JobSourceAttribution> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (result.data || []) as any[]) {
    map[row.key] = {
      key: row.key,
      name: row.name,
      // Default true: the column is NOT NULL DEFAULT true, and a source that
      // predates the column should behave as it did before it existed.
      allowJobPosting: row.allow_jobposting !== false,
      attribution: row.attribution || {},
    }
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

/**
 * One listing by the eight-hex-character prefix of its id — the suffix of a
 * per-job URL (lib/jobSlug.ts).
 *
 * A uuid compares bytewise in Postgres, which is the same order as its hex
 * text, so a prefix is a range on the primary key: no slug column, no second
 * index, and every URL the sitemap has ever emitted still resolves after a
 * retitle. Two live rows sharing a prefix is a 2^-32 event; `limit(2)` lets
 * the caller notice and pick the one whose title matches.
 *
 * Returns null for anything the board would not show: anon RLS hides
 * unapproved and expired rows, and the freshness cut hides the rest. The page
 * turns null into a real 404, which is what Google requires of an expired
 * posting.
 */
export async function getJobByShortId(shortId: string, market = 'gb'): Promise<JobDetail[]> {
  if (!/^[0-9a-f]{8}$/.test(shortId)) return []
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('job_listings')
    .select(JOB_PAGE_COLUMNS)
    .gte('id', `${shortId}-0000-0000-0000-000000000000`)
    .lte('id', `${shortId}-ffff-ffff-ffff-ffffffffffff`)
    .eq('market', market)
    .or(freshnessFilter())
    .limit(2)

  if (error) {
    console.error('Error fetching job by short id:', error)
    return []
  }
  return (data || []).map(mapDbJobDetail)
}

/**
 * Every live listing that is allowed a JobPosting page, for the sitemap.
 *
 * lastModified is approved_at (falling back to first_seen_at), NOT updated_at:
 * the nightly ingest rewrites every re-seen row's volatile columns whether or
 * not anything changed, so updated_at moves daily for the whole board and
 * would tell Google to recrawl everything every day.
 */
export async function getLiveJobPages(market = 'gb'): Promise<{ path: string; lastModified: Date }[]> {
  const supabase = getSupabase()

  const { data: excludedSources, error: sourcesError } = await supabase
    .from('job_sources')
    .select('key')
    .eq('allow_jobposting', false)
  // Fail CLOSED. If the exclusion list cannot be read (the migration not yet
  // applied, or any other error), listing no job pages is recoverable on the
  // next revalidation; listing aggregator-sourced ones is a terms breach.
  if (sourcesError) {
    console.error('Error fetching excluded job sources — listing no job pages:', sourcesError)
    return []
  }
  const excluded = (excludedSources || []).map(r => r.key)

  let query = supabase
    .from('job_listings')
    .select('id, title, profession, source, approved_at, first_seen_at')
    .eq('market', market)
    .or(freshnessFilter())
    .not('profession', 'is', null)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(2000)
  if (excluded.length) query = query.not('source', 'in', `(${excluded.join(',')})`)

  const { data, error } = await query
  if (error) {
    console.error('Error fetching live job pages:', error)
    return []
  }

  const pages: { path: string; lastModified: Date }[] = []
  for (const row of data || []) {
    const path = jobPath(row)
    if (path) pages.push({ path, lastModified: new Date(row.approved_at || row.first_seen_at) })
  }
  return pages
}
