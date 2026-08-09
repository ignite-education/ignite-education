/**
 * Per-source rate limiting.
 *
 * Generalises the Reddit limiter in server.js (the sliding-minute counter plus
 * minimum-delay gate) into a factory, so each source gets its own budget built
 * from its job_sources row rather than sharing one global counter.
 *
 * This only enforces the WITHIN-RUN, per-minute ceiling. Daily/weekly/monthly
 * ToS caps cannot live in process memory — Render's free plan spins the service
 * down — so those are enforced from the database in ./budget.js.
 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * @param {object} options
 * @param {number} [options.perMinute]  max requests in any rolling 60s window
 * @param {number} [options.minDelayMs] minimum gap between consecutive requests
 * @param {string} [options.label]      for log lines
 */
export function createRateLimiter({ perMinute = null, minDelayMs = 250, label = 'source' } = {}) {
  let timestamps = []
  let lastRequestAt = 0

  return {
    label,

    /** Resolves when it is safe to make the next request. */
    async wait() {
      if (perMinute) {
        const now = Date.now()
        timestamps = timestamps.filter(t => now - t < 60_000)

        if (timestamps.length >= perMinute) {
          // Sleep until the oldest request leaves the window, plus a small margin.
          const waitMs = 60_000 - (now - timestamps[0]) + 50
          if (waitMs > 0) {
            console.log(`⏳ [${label}] per-minute cap reached, waiting ${Math.ceil(waitMs / 1000)}s`)
            await sleep(waitMs)
            timestamps = timestamps.filter(t => Date.now() - t < 60_000)
          }
        }
      }

      const sinceLast = Date.now() - lastRequestAt
      if (sinceLast < minDelayMs) {
        await sleep(minDelayMs - sinceLast)
      }

      lastRequestAt = Date.now()
      timestamps.push(lastRequestAt)
    },
  }
}
