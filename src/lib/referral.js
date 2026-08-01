/**
 * Referral crumb — the Vite SPA's half.
 *
 * The crumb is written by the public profile pages, which are served by the
 * Next.js app. Both run on the ignite.education origin (the Vercel rewrites are
 * server-side, so the browser never leaves the apex), which means they share
 * one localStorage. The write side and the TTL live in
 * next-app/src/lib/referral.ts — keep STORAGE_KEY identical in both.
 *
 * This app only ever needs to clear it: without that, person A signing out and
 * person B signing up on the same machine would credit A.
 */
export const REFERRAL_STORAGE_KEY = 'ignite:referrer';

export function clearReferrer() {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — nothing to clear.
  }
}
