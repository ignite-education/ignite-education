'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * The full advert text for one listing, fetched when the detail pane opens it.
 *
 * `description_text` is deliberately absent from BOARD_COLUMNS in jobsData.ts —
 * it runs up to 40KB per row, and multiplying that by the board's 300-row cap
 * would be a 12MB page. Read one row at a time and that cost disappears: the
 * pane shows one job, so it fetches one job. (The per-job page at
 * /jobs/[professionSlug]/[jobSlug] reads the same column server-side, also one
 * row at a time, through jobsData.getJobByShortId.)
 *
 * No API route, and nothing new to secure. The anon policy on job_listings is
 * row-level — `status = 'approved' AND not expired`, see
 * migrations/create_job_board_tables.sql — so the browser is already allowed
 * exactly the rows the board renders, and asking for a column the list query
 * skipped grants it nothing it could not already read. This is NOT the shape of
 * the apply URL, which lives in its own table with no anon policy at all
 * precisely because it must stay unreachable from here; nothing in this file
 * could reach it. An unapproved or expired listing returns no row rather than a
 * forbidden one, which is why there is no status check below — RLS is the
 * authority, and a check here would only be a second, weaker copy of it.
 */

/**
 * Resolved text by job id, and in-flight promises under the same key.
 *
 * Caching the PROMISE rather than the result covers the window a plain result
 * cache does not: clicking back to a role whose request is still in flight
 * must join that request, not start a second one. Comparing two roles by
 * clicking between them does exactly that, and so does a double click on one.
 * Sharing the promise also means the phone's full-screen detail and the desktop
 * pane resolve from a single request when both are mounted.
 *
 * Never evicted. A visitor would have to open every one of the board's 300
 * capped rows to hold a few megabytes, and the map dies with the page.
 */
const cache = new Map<string, Promise<string | null>>()

export function fetchJobDescription(jobId: string): Promise<string | null> {
  const hit = cache.get(jobId)
  if (hit) return hit

  // Wrapped in an async function because the Supabase builder is a thenable,
  // not a Promise — it has no .catch, so the retry handling below needs a real
  // one around it.
  const request = (async () => {
    try {
      const { data, error } = await createClient()
        .from('job_listings')
        .select('description_text')
        .eq('id', jobId)
        .maybeSingle()

      if (error) throw error
      return (data?.description_text as string | null) ?? null
    } catch (err) {
      // Drop the failure so the next open retries. A cached rejection would
      // make one flaky request permanent for the rest of the session.
      cache.delete(jobId)
      throw err
    }
  })()

  cache.set(jobId, request)
  return request
}

/**
 * The block parser moved to lib/descriptionBlocks.ts so the per-job page (a
 * server component) can call it — nothing exported from a 'use client' module
 * is callable on the server. Re-exported here so the pane's import is unchanged.
 */
export { parseDescription, BULLET_MARKER, type DescriptionBlock } from './descriptionBlocks'
