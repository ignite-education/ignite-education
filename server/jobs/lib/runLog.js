/**
 * job_ingest_runs writer.
 *
 * Every run opens a row and closes it, success or failure. Two reasons this
 * matters beyond observability:
 *   - budget.js sums api_calls from these rows to enforce ToS rate caps across
 *     process restarts (Render's free plan spins the service down).
 *   - the `dropped` breakdown is where all filter tuning starts. If the approval
 *     queue is too big or too small, this says which filter to move.
 */

export function createRunLog(supabase) {
  return {
    async start({ source, market, trigger = 'cron' }) {
      const { data, error } = await supabase
        .from('job_ingest_runs')
        .insert({ source, market, trigger, status: 'running' })
        .select('id')
        .single()

      if (error) {
        // Never let bookkeeping take down the ingest itself.
        console.error(`⚠️  [jobs] could not open run log for ${source}/${market}:`, error.message)
        return null
      }
      return data.id
    },

    async finish(runId, { status, stats = {}, dropped = {}, error = null }) {
      if (!runId) return
      const { error: updateError } = await supabase
        .from('job_ingest_runs')
        .update({
          status,
          finished_at: new Date().toISOString(),
          // api_calls counts LIST pages only — one per configured work unit —
          // because expire.js uses it as a proxy for configured scope. Per-job
          // description fetches move with new-job volume and go in detail_calls;
          // folding them together would leave typical_volume permanently null
          // and silently disarm the delisting outage guard.
          api_calls: stats.apiCalls || 0,
          detail_calls: stats.detailCalls || 0,
          fetched: stats.fetched || 0,
          inserted: stats.inserted || 0,
          updated: stats.updated || 0,
          auto_approved: stats.autoApproved || 0,
          queued: stats.queued || 0,
          expired: stats.expired || 0,
          dropped,
          error: error ? String(error).slice(0, 2000) : null,
        })
        .eq('id', runId)

      if (updateError) {
        console.error('⚠️  [jobs] could not close run log:', updateError.message)
      }
    },

    /**
     * Mark long-'running' rows as abandoned.
     *
     * A Render cold start killed mid-run leaves a row stuck at 'running', which
     * would otherwise inflate the budget calculation forever.
     */
    async reapAbandoned({ olderThanMinutes = 30 } = {}) {
      const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('job_ingest_runs')
        .update({ status: 'abandoned', finished_at: new Date().toISOString() })
        .eq('status', 'running')
        .lt('started_at', cutoff)
        .select('id')
      if (data?.length) {
        console.log(`🧹 [jobs] marked ${data.length} stalled run(s) abandoned`)
      }
    },
  }
}

/** Tally helper — keeps `dropped` counting to one call per drop. */
export function createDropCounter() {
  const counts = {}
  return {
    count(reason) {
      counts[reason] = (counts[reason] || 0) + 1
    },
    get all() {
      return counts
    },
    get total() {
      return Object.values(counts).reduce((sum, n) => sum + n, 0)
    },
  }
}
