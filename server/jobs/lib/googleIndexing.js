/**
 * Tell Google which per-job pages exist and which have gone.
 *
 * The Indexing API is the mechanism Google recommends for JobPosting URLs:
 * a URL_UPDATED prompts a crawl within hours rather than whenever the sitemap
 * is next read, and a URL_DELETED is how an expired posting leaves the Jobs
 * tab before Google notices the 404 on its own — which matters, because
 * leaving expired postings in markup is what earns a manual action.
 *
 * Runs as the LAST step of runJobIngest() (../index.js), after every source
 * has persisted and swept, so one pass sees the whole night's changes. It
 * never throws out of the ingest: a Google outage must not fail the ingest
 * that produced the inventory.
 *
 * What it sends, in order:
 *   1. URL_DELETED for every listing it previously announced that is no
 *      longer live (unapproved, expired, or past the posted-age cut). First,
 *      because removals are the compliance half and the daily quota is small.
 *   2. URL_UPDATED for every live, eligible listing it has never announced
 *      (or last announced as deleted — a revived row is re-announced).
 *
 * What it never does: resend URL_UPDATED for a row it already announced.
 * The nightly refresh rewrites every re-seen row's volatile columns, so
 * "changed since last night" would be the whole board every night and burn
 * the quota on no-ops. ISR keeps the page itself fresh; Google recrawls on
 * its own cadence.
 *
 * Eligibility mirrors the page's rule (next-app/src/app/jobs/[professionSlug]/
 * [jobSlug]/page.tsx): approved, unexpired, within the posted-age cut, has a
 * profession, source allows JobPosting, advert long enough. A URL this
 * announces is a URL that page will render with markup; a URL it skips is one
 * the page noindexes. The URL contract itself is lib/jobSlug.ts in next-app,
 * mirrored in jobPath() below — change both together.
 *
 * Auth is a service-account JWT signed with Node's own crypto. google-auth-
 * library would add fifteen packages to a server with no other Google
 * dependency for what is twenty lines of RS256.
 *
 * Quota: 200 publish requests per day per project by default. The cap below
 * is counted against index_notified_at in the DATABASE, not in memory,
 * because the GitHub workflow calls the ingest endpoint twice a night (startup
 * ATSs, then enterprise ATSs) and Render's free plan restarts between them.
 *
 * Manual setup (once, by a Search Console owner):
 *   1. Google Cloud console → new project → enable "Web Search Indexing API".
 *   2. IAM → Service accounts → create one → Keys → add JSON key.
 *   3. Search Console → ignite.education property → Settings → Users and
 *      permissions → add the service account's client_email as OWNER.
 *      (Delegated owner is enough; without it every call is a 403.)
 *   4. Set GOOGLE_INDEXING_CLIENT_EMAIL and GOOGLE_INDEXING_PRIVATE_KEY on
 *      Render (the key with literal \n — it is unescaped on read) and locally
 *      in .env for scripts/notify-google-indexing.mjs.
 */

import crypto from 'node:crypto'
import { slugify } from './normalise.js'
import { postedAgeCutoffIso } from './expire.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
const SCOPE = 'https://www.googleapis.com/auth/indexing'
const SITE_URL = 'https://ignite.education'

/** Mirrors MIN_JOBPOSTING_DESCRIPTION_CHARS in next-app/src/lib/structuredData.ts. */
const MIN_DESCRIPTION_CHARS = 200
const DEFAULT_DAILY_CAP = 180   // headroom under Google's 200
const SHORT_ID_LEN = 8

// ─── URL contract (mirror of next-app/src/lib/jobSlug.ts) ────────────────────

/** Mirrors professionToSlug() in next-app/src/lib/professionUtils.ts. */
function professionToSlug(name) {
  return String(name).toLowerCase().replace(/\s+/g, '-')
}

export function jobPath({ id, title, profession }) {
  if (!profession) return null
  return `/jobs/${professionToSlug(profession)}/${slugify(title) || 'job'}-${String(id).slice(0, SHORT_ID_LEN)}`
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * The private key as OpenSSL needs it: a PEM with real newlines.
 *
 * Every dashboard mangles a pasted PEM differently, and OpenSSL's answer to
 * all of them is the same unhelpful `DECODER routines::unsupported`. Accept
 * the shapes that actually turn up — the JSON file's value with literal \n,
 * that value escaped once more by a shell or a secrets UI (\\n), the value
 * with its JSON quotes still on, the whole key file pasted as one blob, and
 * a base64 of the PEM — and reject anything that still does not look like a
 * key, naming what was found so the fix is obvious from the log.
 */
export function normalisePrivateKey(raw) {
  let key = String(raw || '').trim()
  if (key.startsWith('{')) {
    try { key = JSON.parse(key).private_key || '' } catch { /* fall through to the check below */ }
  }
  key = key.replace(/^['"]+|['"]+$/g, '')
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r/g, '')
  if (!key.includes('-----BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8')
      if (decoded.includes('-----BEGIN')) key = decoded
    } catch { /* not base64 */ }
  }
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+-----END [A-Z ]*PRIVATE KEY-----/.test(key)) {
    throw new Error(
      `GOOGLE_INDEXING_PRIVATE_KEY is not a PEM private key (starts "${key.slice(0, 20)}", ` +
      `${key.length} chars). Paste the private_key value from the service account's JSON file.`
    )
  }
  return key.trim() + '\n'
}

function readCredentials() {
  const rawKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY
  let email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL
  if (!rawKey) return null
  // The whole JSON key file pasted into the key variable carries the email too.
  if (!email && rawKey.trim().startsWith('{')) {
    try { email = JSON.parse(rawKey).client_email } catch { /* reported below */ }
  }
  if (!email) return null
  return { email, key: normalisePrivateKey(rawKey) }
}

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

/** OAuth2 access token via the JWT bearer grant. Valid for an hour; one per run. */
async function getAccessToken({ email, key }, { fetchImpl = fetch } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
  }))
  let signature
  try {
    signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key, 'base64url')
  } catch (error) {
    throw new Error(`GOOGLE_INDEXING_PRIVATE_KEY could not be used to sign (${error.message}) — re-paste the private_key value from the JSON key file`)
  }
  const assertion = `${header}.${claims}.${signature}`

  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
  const body = await res.json()
  if (!body.access_token) throw new Error('token response carried no access_token')
  return body.access_token
}

// ─── Worklists ───────────────────────────────────────────────────────────────

const WORK_COLUMNS = 'id, title, profession, source, status, expires_at, posted_at, index_notified_type'

async function loadExcludedSources(supabase) {
  const { data } = await supabase.from('job_sources').select('key').eq('allow_jobposting', false)
  return new Set((data || []).map(r => r.key))
}

/** Announced as live, and no longer is. */
async function loadDeletions(supabase, { limit }) {
  const nowIso = new Date().toISOString()
  const cutoff = postedAgeCutoffIso()
  const { data, error } = await supabase
    .from('job_listings')
    .select(WORK_COLUMNS)
    .eq('index_notified_type', 'URL_UPDATED')
    .or(`status.neq.approved,expires_at.lt.${nowIso},posted_at.lt.${cutoff}`)
    .order('index_notified_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`deletions query: ${error.message}`)
  return data || []
}

/** Live and eligible, never announced (or last announced as deleted). */
async function loadAdditions(supabase, { limit, excludedSources }) {
  const nowIso = new Date().toISOString()
  const cutoff = postedAgeCutoffIso()
  let query = supabase
    .from('job_listings')
    .select(`${WORK_COLUMNS}, description_text`)
    .eq('status', 'approved')
    .not('profession', 'is', null)
    .or('index_notified_type.is.null,index_notified_type.eq.URL_DELETED')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .or(`posted_at.is.null,posted_at.gte.${cutoff}`)
    .order('posted_at', { ascending: false, nullsFirst: false })
    // Over-fetch: the description-length filter below is applied in process,
    // since PostgREST cannot filter on length(). Rows that fail it are not
    // charged against the budget.
    .limit(limit * 3)
  if (excludedSources.size) query = query.not('source', 'in', `(${[...excludedSources].join(',')})`)

  const { data, error } = await query
  if (error) throw new Error(`additions query: ${error.message}`)
  return (data || [])
    .filter(row => (row.description_text || '').length >= MIN_DESCRIPTION_CHARS)
    .slice(0, limit)
}

async function spentToday(supabase) {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from('job_listings')
    .select('id', { count: 'exact', head: true })
    .gte('index_notified_at', startOfDay.toISOString())
  if (error) throw new Error(`quota count: ${error.message}`)
  return count || 0
}

// ─── Publish ─────────────────────────────────────────────────────────────────

/**
 * Stops the run on the two errors that mean "every further call will fail
 * too": quota exhausted, and the service account not being a Search Console
 * owner. Anything else is recorded on the row and the run continues.
 */
class StopRun extends Error {}

async function publish({ token, url, type, fetchImpl }) {
  const res = await fetchImpl(PUBLISH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type }),
  })
  if (res.ok) return null
  const text = (await res.text()).slice(0, 300)
  if (res.status === 429) throw new StopRun(`quota exhausted (429): ${text}`)
  if (res.status === 403) {
    throw new StopRun(
      `403 from the Indexing API — the service account is not an Owner of the ` +
      `ignite.education Search Console property, or the API is not enabled: ${text}`
    )
  }
  return `HTTP ${res.status}: ${text}`
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * @param {object} supabase  service-role client
 * @param {object} [options]
 * @param {boolean} [options.dryRun]  list the worklist, send nothing, write nothing
 * @param {function} [options.log]
 * @param {function} [options.fetchImpl]  for tests
 * @returns {{ skipped?: true, reason?: string, updated: number, deleted: number,
 *             errors: number, budgetLeft: number, dryRun?: boolean,
 *             worklist?: { deletions: string[], additions: string[] } }}
 */
export async function notifyGoogleIndexing(supabase, { dryRun = false, log = console.log, fetchImpl = fetch } = {}) {
  const empty = { updated: 0, deleted: 0, errors: 0, budgetLeft: 0 }

  if (process.env.GOOGLE_INDEXING_ENABLED === 'false') {
    return { ...empty, skipped: true, reason: 'GOOGLE_INDEXING_ENABLED=false' }
  }
  let credentials
  try {
    credentials = readCredentials()
  } catch (error) {
    console.error('[jobs] Google Indexing API credentials are unusable:', error.message)
    return { ...empty, errors: 1, failed: error.message }
  }
  if (!credentials) {
    log('ℹ️  [jobs] Google Indexing API not configured (GOOGLE_INDEXING_CLIENT_EMAIL / _PRIVATE_KEY) — skipping')
    return { ...empty, skipped: true, reason: 'no credentials' }
  }

  try {
    const cap = Number(process.env.GOOGLE_INDEXING_DAILY_CAP) || DEFAULT_DAILY_CAP
    const spent = await spentToday(supabase)
    let budget = Math.max(0, cap - spent)
    if (budget === 0) {
      log(`ℹ️  [jobs] Google Indexing API daily cap reached (${spent}/${cap}) — nothing sent`)
      return { ...empty, skipped: true, reason: 'daily cap reached' }
    }

    const excludedSources = await loadExcludedSources(supabase)
    const deletions = await loadDeletions(supabase, { limit: budget })
    const additions = await loadAdditions(supabase, {
      limit: Math.max(0, budget - deletions.length),
      excludedSources,
    })

    if (dryRun) {
      return {
        ...empty,
        dryRun: true,
        budgetLeft: budget,
        worklist: {
          deletions: deletions.map(r => `${SITE_URL}${jobPath(r)}`),
          additions: additions.map(r => `${SITE_URL}${jobPath(r)}`),
        },
      }
    }

    const token = await getAccessToken(credentials, { fetchImpl })
    const result = { updated: 0, deleted: 0, errors: 0 }

    const send = async (row, type) => {
      const path = jobPath(row)
      if (!path) return
      const url = `${SITE_URL}${path}`
      const failure = await publish({ token, url, type, fetchImpl })
      const stamp = new Date().toISOString()
      if (failure) {
        result.errors++
        await supabase.from('job_listings').update({ index_notify_error: failure }).eq('id', row.id)
        log(`⚠️  [jobs] indexing ${type} failed for ${url}: ${failure}`)
        return
      }
      budget--
      await supabase
        .from('job_listings')
        .update({ index_notified_at: stamp, index_notified_type: type, index_notify_error: null })
        .eq('id', row.id)
      if (type === 'URL_DELETED') result.deleted++
      else result.updated++
    }

    try {
      for (const row of deletions) {
        if (budget <= 0) break
        await send(row, 'URL_DELETED')
      }
      for (const row of additions) {
        if (budget <= 0) break
        await send(row, 'URL_UPDATED')
      }
    } catch (error) {
      if (!(error instanceof StopRun)) throw error
      log(`⛔ [jobs] indexing stopped: ${error.message}`)
      result.stopped = error.message
    }

    log(
      `📡 [jobs] Google Indexing API: ${result.updated} announced, ${result.deleted} removed, ` +
      `${result.errors} errors, ${budget} of today's cap left`
    )
    return { ...result, budgetLeft: budget }
  } catch (error) {
    // Never fail the ingest over this. The next night retries everything it
    // did not mark done.
    console.error('[jobs] Google Indexing API step failed:', error.message)
    return { ...empty, errors: 1, failed: error.message }
  }
}
