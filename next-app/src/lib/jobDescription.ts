'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * The full advert text for one listing, fetched when the detail pane opens it.
 *
 * `description_text` is deliberately absent from BOARD_COLUMNS in jobsData.ts —
 * it runs up to 40KB per row, and multiplying that by the board's 300-row cap
 * would be a 12MB page. Read one row at a time and that cost disappears: the
 * pane shows one job, so it fetches one job.
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
 * Split the advert into renderable blocks.
 *
 * htmlToText (server/jobs/lib/normalise.js) has already flattened the
 * employer's markup: `<br>` and block closes became newlines, `<li>` became a
 * "• " prefix, and runs of blank lines were collapsed to at most one. So the
 * text arrives pre-structured and all this has to do is read that structure
 * back — paragraphs on newlines, and a bullet wherever the marker survived.
 *
 * The marker is not always ours. htmlToText only writes "• " for a real <li>,
 * and a great many adverts are typed into a plain-text field in the ATS with a
 * hyphen or an asterisk instead — those arrive as literal characters and no
 * list markup ever existed to convert. BULLET_MARKER therefore takes the lot.
 * The trailing \s+ is what keeps it honest: it matches "- Lead the discovery"
 * and leaves "e-commerce" and a line opening on a negative number alone.
 *
 * Rendering description_text rather than description_html is a security
 * decision as much as a formatting one. The HTML column is markup we did not
 * write, from hundreds of employers and half a dozen ATS vendors, and putting
 * it on the page would mean dangerouslySetInnerHTML and a sanitiser to
 * maintain. Plain text cannot carry a script.
 */
export interface DescriptionBlock {
  type: 'bullet' | 'paragraph'
  text: string
}

const BULLET_MARKER = /^[•·*–—-]\s+/

export function parseDescription(text: string): DescriptionBlock[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line =>
      BULLET_MARKER.test(line)
        ? { type: 'bullet' as const, text: line.replace(BULLET_MARKER, '') }
        : { type: 'paragraph' as const, text: line }
    )
    .filter(block => block.text.length > 0)
}
