/**
 * Sign-up attribution — which surface a person created their account on.
 *
 * Every entry point passes one of these values, and the admin portal's user
 * list shows and filters by it. The value is written once, by the
 * `record_signup_source` RPC (migrations/add_signup_source.sql), which only
 * accepts it inside the sign-up window — so a returning user who signs in from
 * the jobs page a year later keeps their original source.
 *
 * Two journeys reach the database by different roads, and both are covered:
 *
 *   1. Full OAuth redirect — carried as ?source= on the /auth/callback URL and
 *      recorded server-side in the callback route, right after the user row
 *      is guaranteed to exist.
 *   2. Google One Tap, and the pages that OAuth straight back to themselves
 *      (prompts, the welcome page's course-request fallback) — these never
 *      run the callback, so the page calls recordSignupSource() itself.
 *
 * The RPC is idempotent and a no-op for existing accounts, so a path that is
 * covered twice (One Tap on a page that also lands in the callback) is safe.
 *
 * Labels for the admin portal live in admin-app/src/lib/signupSource.js —
 * keep the two lists in step.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const SIGNUP_SOURCES = {
  /** /jobs — the apply gate or the "get job alerts" modal */
  JOBS: 'jobs',
  /** /courses/{slug} — the enrol / save CTA, or "start lesson" via /sign-in?course= */
  COURSE_PAGE: 'course_page',
  /** /welcome or /courses — "request a course" from the search box */
  COURSE_REQUEST: 'course_request',
  /** ignite.education/{username} — a public profile (also claims the referral) */
  PROFILE: 'profile',
  /** /prompts — saving or contributing a prompt */
  PROMPTS: 'prompts',
  /** /sign-in — came to the form directly (navbar, bookmark, link) */
  SIGN_IN_PAGE: 'sign_in_page',
  /** The Vite SPA's own sign-in (the dev form; legacy in-app flows) */
  APP: 'app',
} as const

export type SignupSource = (typeof SIGNUP_SOURCES)[keyof typeof SIGNUP_SOURCES]

const VALID = new Set<string>(Object.values(SIGNUP_SOURCES))

/** Narrow an untrusted string (a URL param) to a known source, or null. */
export function parseSignupSource(value: string | null | undefined): SignupSource | null {
  return value && VALID.has(value) ? (value as SignupSource) : null
}

/**
 * Record the source for the signed-in user. Resolves true when the row was
 * stamped, false when it was already set, the account is not new, or the
 * migration has not been applied. Never throws — attribution must not turn a
 * successful sign-in into an error.
 */
export async function recordSignupSource(
  supabase: SupabaseClient,
  source: SignupSource | null | undefined
): Promise<boolean> {
  if (!source) return false
  try {
    const { data, error } = await supabase.rpc('record_signup_source', { p_source: source })
    if (error) {
      console.error('[signupSource] record failed:', error.message)
      return false
    }
    return data === true
  } catch (e) {
    console.error('[signupSource] record threw:', e)
    return false
  }
}
