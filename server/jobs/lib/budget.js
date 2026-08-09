/**
 * API call budgeting.
 *
 * Aggregator terms cap calls over several windows at once — typically a
 * per-minute rate plus daily, weekly and monthly quotas.
 * The per-minute ceiling is enforced in process by rateLimiter.js, but the
 * longer windows CANNOT be: Render's free plan spins the web service down, so a
 * few restarts would reset an in-memory counter and quietly breach the terms —
 * and the stated penalty is losing the key.
 *
 * So the budget is read from the database: sum api_calls over job_ingest_runs
 * for the rolling windows. The orchestrator then trims how many pages it will
 * fetch rather than aborting, and records `budget_exhausted` in the run's
 * dropped breakdown so truncation is visible rather than silent.
 */

const WINDOWS = [
  { key: 'rate_per_day', label: 'day', ms: 24 * 60 * 60 * 1000 },
  { key: 'rate_per_week', label: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'rate_per_month', label: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
]

/**
 * How many API calls this source may still make.
 *
 * @returns {Promise<{allowed: number, limited: boolean, detail: string|null}>}
 *          allowed is Infinity when the source declares no long-window caps.
 */
export async function getAllowance(supabase, source) {
  const applicable = WINDOWS.filter(w => Number.isFinite(source[w.key]) && source[w.key] > 0)
  if (applicable.length === 0) {
    return { allowed: Infinity, limited: false, detail: null }
  }

  let allowed = Infinity
  let detail = null

  for (const window of applicable) {
    const since = new Date(Date.now() - window.ms).toISOString()
    const { data, error } = await supabase
      .from('job_ingest_runs')
      .select('api_calls')
      .eq('source', source.key)
      .gte('started_at', since)

    if (error) {
      // Failing closed here would silently stop all ingest on a transient DB
      // hiccup. Fail open but say so loudly — the per-minute limiter still
      // applies, so the blast radius is one run's worth of calls.
      console.error(`⚠️  [jobs] budget lookup failed for ${source.key}, proceeding uncapped:`, error.message)
      return { allowed: Infinity, limited: false, detail: 'budget-lookup-failed' }
    }

    const spent = (data || []).reduce((sum, row) => sum + (row.api_calls || 0), 0)
    const remaining = source[window.key] - spent

    if (remaining < allowed) {
      allowed = remaining
      detail = `${spent}/${source[window.key]} per ${window.label}`
    }
  }

  return {
    allowed: Math.max(0, allowed),
    limited: true,
    detail,
  }
}

/**
 * Trim a planned set of query/account work units to fit the remaining budget.
 *
 * Preserves order, so the highest-value queries (seeded first) survive when the
 * budget is tight.
 *
 * @param {Array<{maxPages: number}>} units
 * @param {number} allowed
 * @returns {{units: Array, dropped: number, plannedCalls: number}}
 */
export function fitToBudget(units, allowed) {
  if (!Number.isFinite(allowed)) {
    return {
      units,
      dropped: 0,
      plannedCalls: units.reduce((sum, u) => sum + (u.maxPages || 1), 0),
    }
  }

  const kept = []
  let plannedCalls = 0
  let dropped = 0

  for (const unit of units) {
    const cost = unit.maxPages || 1
    if (plannedCalls + cost <= allowed) {
      kept.push(unit)
      plannedCalls += cost
    } else {
      // Partial fit: take whatever pages are left rather than skipping wholesale.
      const room = allowed - plannedCalls
      if (room > 0) {
        kept.push({ ...unit, maxPages: room })
        plannedCalls += room
      }
      dropped++
    }
  }

  return { units: kept, dropped, plannedCalls }
}
