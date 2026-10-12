/**
 * The chip every circumstance of a role wears — the tag from /progress
 * section 1 (IntroSection's "Joined" / "12 Lessons" / "Insider" row): 12px,
 * black, 4px radius, 8×3 padding. See JobCard for why the employer is the one
 * fact that does not wear it.
 *
 * Directive-free so the per-job page (a server component) can use the same
 * chip as the card and the pane. A constant exported from a 'use client'
 * module arrives on the server as a client reference, not a string.
 */
export const META_TAG_CLASS = 'inline-block px-[8px] py-[3px] text-black bg-[#F6F6F6] rounded-[4px] font-normal'
export const metaTagStyle = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontSize: '12px',
  letterSpacing: '-0.02em',
} as const
