/**
 * Expiry sweep.
 *
 * A vacancy leaves the board when any of:
 *   - its expires_at passes,
 *   - it was posted more than MAX_POSTED_AGE_DAYS ago, or
 *   - the source stopped returning it (delisted → filled or withdrawn).
 *
 * THE OUTAGE GUARD IS NOT OPTIONAL.
 *
 * The delisting rule is inherently dangerous: if a source has a partial outage
 * and returns 12 jobs instead of 800, the "we did not see it" rule would expire
 * the entire board in one run. So the delisting clause only runs when this run
 * fetched at least half of what the source normally returns. When the guard
 * trips we fall back to expires_at only and mark the run `partial`, which
 * surfaces in the admin Runs tab rather than failing silently.
 */

export const DELIST_GRACE_DAYS = 3
export const VOLUME_GUARD_RATIO = 0.5
export const STALE_PENDING_DAYS = 14

/**
 * How old a posting may be before it leaves the board, whatever the source
 * still says about it.
 *
 * Duplicated as MAX_POSTED_AGE_DAYS in next-app/src/data/jobsData.ts, which
 * applies the same cut at read time so the board is right immediately rather
 * than after the next nightly sweep. Change both together.
 *
 * READ THIS BEFORE TUNING IT — the number is not as simple as it looks. The
 * rule reads `posted_at`, and on ATS feeds `posted_at` is when the requisition
 * record was created, not when the advert went up. Evergreen roles therefore
 * carry dates years old while staying genuinely open.
 *
 * That trade is deliberate rather than accidental — a visitor cannot tell an
 * evergreen requisition from an abandoned one, and an advert dated six months
 * back reads as cold whether or not it is. But it is a product judgement, and
 * this constant is the dial.
 *
 * Measured across all 18 enabled boards (3,008 jobs fetched), counting only
 * jobs that already pass the profession and market filters:
 *
 *     21d → 20    30d → 37    45d → 45    60d → 48    90d → 49    no cut → 67
 *
 * Set to 45 because that is where the curve flattens: 21→45 more than doubles
 * the board, 45→90 adds four. What 21 was discarding was not stale — 25 of the
 * 47 it removed were Product Manager roles at LSEG, Deliveroo and Monzo, all
 * still live in the employer's own feed on the day they were dropped. Beyond
 * 60 days the remainder genuinely are evergreen requisitions.
 *
 * If the goal is ever "drop what has gone cold on OUR board" rather than "drop
 * what the employer dated long ago", the column to switch to is `first_seen_at`
 * — the same anchor computeExpiry() already uses, and for the same reason.
 */
export const MAX_POSTED_AGE_DAYS = Number(process.env.JOBS_MAX_POSTED_AGE_DAYS) || 45

/** The oldest posted_at still allowed on the board, as an ISO timestamp. */
export function postedAgeCutoffIso() {
  return new Date(Date.now() - MAX_POSTED_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * @returns {Promise<{expired: number, guardTripped: boolean}>}
 */
export async function sweepExpired(supabase, { source, market, fetched, typicalVolume }) {
  const nowIso = new Date().toISOString()

  // Always safe: anything past its own expiry date.
  const { data: byDate, error: dateError } = await supabase
    .from('job_listings')
    .update({ status: 'expired', expired_at: nowIso })
    .eq('source', source.key)
    .eq('market', market.code)
    .eq('status', 'approved')
    .lt('expires_at', nowIso)
    .select('id')

  if (dateError) {
    console.error(`⚠️  [jobs] expiry-by-date failed for ${source.key}:`, dateError.message)
  }

  let expired = byDate?.length || 0

  // Also always safe: posted too long ago. Unguarded, unlike delisting below —
  // it reads a stored column rather than inferring from what this run happened
  // to fetch, so a source outage cannot make it fire wrongly.
  //
  // Rows with no posted_at are left alone. "Older than three weeks" is not a
  // claim we can make about a listing with no date, and delisting already
  // covers those.
  const { data: byAge, error: ageError } = await supabase
    .from('job_listings')
    .update({ status: 'expired', expired_at: nowIso })
    .eq('source', source.key)
    .eq('market', market.code)
    .eq('status', 'approved')
    .not('posted_at', 'is', null)
    .lt('posted_at', postedAgeCutoffIso())
    .select('id')

  if (ageError) {
    console.error(`⚠️  [jobs] posted-age sweep failed for ${source.key}:`, ageError.message)
  } else {
    expired += byAge?.length || 0
  }

  // The delisting rule, guarded.
  const guardTripped =
    Number.isFinite(typicalVolume) &&
    typicalVolume > 0 &&
    fetched < typicalVolume * VOLUME_GUARD_RATIO

  if (guardTripped) {
    console.warn(
      `🛡️  [jobs] ${source.key}/${market.code}: fetched ${fetched} vs typical ${typicalVolume} — ` +
      'skipping delist sweep to avoid mass-expiring the board on a source outage'
    )
    return { expired, guardTripped: true }
  }

  const graceCutoff = new Date(Date.now() - DELIST_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: byDelist, error: delistError } = await supabase
    .from('job_listings')
    .update({ status: 'expired', expired_at: nowIso })
    .eq('source', source.key)
    .eq('market', market.code)
    .eq('status', 'approved')
    .lt('last_seen_at', graceCutoff)
    .select('id')

  if (delistError) {
    console.error(`⚠️  [jobs] delist sweep failed for ${source.key}:`, delistError.message)
  } else {
    expired += byDelist?.length || 0
  }

  return { expired, guardTripped: false }
}

/**
 * Retire pending rows nobody reviewed.
 *
 * Without this the approval queue accretes a backlog that will never be worked
 * through, and a two-week-old vacancy is usually filled anyway.
 */
export async function sweepStalePending(supabase, { source, market }) {
  const cutoff = new Date(Date.now() - STALE_PENDING_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('job_listings')
    .update({ status: 'stale' })
    .eq('source', source.key)
    .eq('market', market.code)
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    console.error(`⚠️  [jobs] stale-pending sweep failed:`, error.message)
    return 0
  }
  return data?.length || 0
}

/**
 * Keep job_sources.typical_volume as a rolling median of recent runs at the
 * SAME CONFIGURED SCOPE. The median, not the mean, so one bad run cannot drag
 * the guard down and disarm it for the next one.
 *
 * The scope qualifier is what stops the guard deadlocking, and it is subtle
 * enough to be worth spelling out.
 *
 * The guard exists to catch a source that has gone wrong — same configuration,
 * suddenly far fewer jobs. It cannot, on volume alone, distinguish that from us
 * deliberately shrinking our own account list, which is a legitimate drop of
 * exactly the same shape. When that happened (disabling non-allowlisted ATS
 * boards took ashby from ~2,800 jobs to ~230) the old version deadlocked:
 * guard trips -> run marked `partial` -> a `success`-only median never updates
 * -> the guard trips forever and the delist sweep never runs again, so
 * withdrawn vacancies stay on the board indefinitely.
 *
 * `api_calls` is the available proxy for configured scope — for ATS sources it
 * is one call per enabled account. Comparing only against runs with the same
 * value means:
 *
 *   - Real outage: scope is unchanged, so the low run is one sample among ten
 *     and the median barely moves. The guard stays armed.
 *   - Config change: no history at the new scope, so this run becomes the
 *     baseline and the guard is inert until comparable history accumulates.
 *
 * Runs are no longer filtered to `status = 'success'` for the same reason — a
 * run whose only fault was tripping this guard must still be able to re-baseline.
 * Failed runs are excluded because their `fetched` reflects an abort, not volume.
 */
export async function updateTypicalVolume(supabase, sourceKey, marketCode, apiCalls = null) {
  let query = supabase
    .from('job_ingest_runs')
    .select('fetched')
    .eq('source', sourceKey)
    .eq('market', marketCode)
    .in('status', ['success', 'partial'])

  if (Number.isFinite(apiCalls)) query = query.eq('api_calls', apiCalls)

  const { data, error } = await query.order('started_at', { ascending: false }).limit(10)

  if (error || !data?.length) return null

  const values = data.map(r => r.fetched || 0).sort((a, b) => a - b)
  const median = values[Math.floor(values.length / 2)]

  await supabase
    .from('job_sources')
    .update({ typical_volume: median, last_run_at: new Date().toISOString() })
    .eq('key', sourceKey)

  return median
}
