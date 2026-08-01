/**
 * Referral attribution — remembering which profile a signup came from.
 *
 * When someone creates an account from a public profile page
 * (ignite.education/{username}), both sides get a free week of Ignite Insider.
 * The attribution has to survive three different journeys:
 *
 *   1. Full OAuth redirect  — carried in ?ref= on the /auth/callback URL
 *   2. Google One Tap       — never navigates, so the page claims inline
 *   3. "I'll sign up later" — the crumb below, read at /sign-in or a course page
 *
 * All three call the same endpoint, and UNIQUE(referee_id) on public.referrals
 * makes a double-claim a no-op, so the layers can overlap freely.
 *
 * The crumb is localStorage rather than sessionStorage on purpose: profile
 * pages open course cards in a new tab (CourseCatalogClient openInNewTab), where
 * sessionStorage would be empty. STORAGE_KEY is mirrored in
 * src/lib/referral.js, which is how the Vite SPA clears it on sign-out.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ignite-education-api.onrender.com'

const STORAGE_KEY = 'ignite:referrer'
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type Crumb = { u: string; t: number }

/** Last touch wins: visiting a second profile overwrites the first. */
export function rememberReferrer(username: string) {
  if (!username) return
  try {
    const crumb: Crumb = { u: username, t: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(crumb))
  } catch {
    // Private mode / storage disabled — the ?ref= layer still covers the
    // straight-through signup, which is the common case.
  }
}

/** Returns null past the TTL, so an ancient visit can't credit anyone. */
export function readReferrer(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const crumb = JSON.parse(raw) as Crumb
    if (!crumb?.u || typeof crumb.t !== 'number') return null
    if (Date.now() - crumb.t > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return crumb.u
  } catch {
    return null
  }
}

export function clearReferrer() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

export type ClaimResult = {
  claimed: boolean
  alreadyClaimed?: boolean
  reason?: string
  insiderUntil?: string | null
  referrer?: { username: string; firstName: string | null }
}

/**
 * Best-effort claim. Never throws and never rejects: this runs on the signup
 * path, where a failed referral must not become a failed sign-in. The server
 * enforces the real rules (self-referral, account age, caps) and answers 200
 * with { claimed: false, reason } when it declines.
 */
export async function claimReferral(
  accessToken: string,
  referrerUsername: string
): Promise<ClaimResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/referrals/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ referrerUsername }),
    })
    if (!res.ok) return null
    return (await res.json()) as ClaimResult
  } catch (e) {
    console.error('[referral] claim failed:', e)
    return null
  }
}
