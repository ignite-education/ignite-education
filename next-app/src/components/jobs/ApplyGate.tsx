'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import JobSignupModal from './JobSignupModal'

/**
 * The sign-in-to-apply gate.
 *
 * The outbound URL is NEVER in this page. It lives in job_listing_apply, which
 * has no anon RLS policy, and the board renders through the cookie-less anon
 * client — so the URL is unreachable from the public page, not merely hidden in
 * it. `GET /api/jobs/:id/apply` behind verifyAuth is the only reader.
 *
 * Everything here therefore happens CLIENT-SIDE after hydration. That is not a
 * style choice: the board is ISR, so its HTML is a shared cache entry. Resolving
 * the URL server-side "when the user is signed in" would bake one signed-in
 * render into the cache and serve it to every anonymous visitor.
 *
 * Split into a hook and a button because the whole card is the click target.
 * The card owns the handler; the button is the affordance inside it and a real
 * focusable control for keyboard users, and its click simply bubbles up to the
 * card. One handler, so a click can never resolve the same job twice.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ignite-education-api.onrender.com'

/**
 * Open the tab the vacancy will land in, synchronously with the click.
 *
 * Deliberately NOT `noopener`: window.open() returns **null** whenever noopener
 * is passed — by spec, not by quirk — and a null handle is useless to us. We
 * could neither navigate this tab once the URL resolves nor close it when the
 * lookup fails, so every click left an orphaned blank tab and the vacancy never
 * loaded. Disowning the tab with `opener = null` gives the same protection: the
 * destination cannot reach back into this page, and the disowning survives the
 * navigation below.
 */
function openPlaceholderTab(): Window | null {
  const tab = window.open('', '_blank')
  if (tab) tab.opener = null
  return tab
}

interface UseApplyActionArgs {
  jobId: string
  jobTitle: string
  company: string
  /** null while the auth check is still resolving. */
  isSignedIn: boolean | null
}

export function useApplyAction({ jobId, jobTitle, company, isSignedIn }: UseApplyActionArgs) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Resolve the URL and send the already-open tab to it.
   *
   * `tab` must have been opened SYNCHRONOUSLY in the click handler — a
   * window.open() after an await is treated as unrequested by popup blockers
   * and silently dies.
   */
  const resolveAndGo = useCallback(async (tab: Window | null) => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        tab?.close()
        setShowModal(true)
        return
      }

      const response = await fetch(`${API_URL}/api/jobs/${jobId}/apply`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!response.ok) {
        tab?.close()
        const body = await response.json().catch(() => ({}))
        setError(
          response.status === 410
            ? 'This role is no longer accepting applications.'
            : body.error || 'Could not open this job. Try again shortly.'
        )
        return
      }

      const { url } = await response.json()
      if (!url) { tab?.close(); setError('Could not open this job.'); return }

      if (tab) tab.location.href = url
      else window.open(url, '_blank', 'noopener')   // popup was blocked
    } catch (err) {
      tab?.close()
      console.error('[ApplyGate] failed to resolve apply URL:', err)
      setError('Could not open this job. Try again shortly.')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  /**
   * Hang this on the whole card. Guarded on `loading` because the card is a far
   * bigger target than the button was — without it, an impatient second click
   * anywhere on the row would resolve the job and open a second tab.
   */
  const apply = useCallback(() => {
    if (loading) return

    // Synchronous, before any await — see resolveAndGo.
    const tab = isSignedIn === false ? null : openPlaceholderTab()

    if (isSignedIn === false) {
      setShowModal(true)
      return
    }
    void resolveAndGo(tab)
  }, [isSignedIn, loading, resolveAndGo])

  // After a One Tap sign-in the modal closes and we resolve straight away, so
  // the visitor's original click still lands them on the vacancy.
  const handleSignedIn = useCallback(() => {
    setShowModal(false)
    void resolveAndGo(openPlaceholderTab())
  }, [resolveAndGo])

  const modal = showModal ? (
    <JobSignupModal
      jobTitle={jobTitle}
      company={company}
      returnPath={typeof window !== 'undefined' ? `${window.location.pathname}?job=${jobId}` : '/jobs'}
      onClose={() => setShowModal(false)}
      onSignedIn={handleSignedIn}
    />
  ) : null

  return { apply, loading, error, modal }
}

interface ApplyButtonProps {
  className?: string
}

/**
 * The visible control. Deliberately carries NO onClick: activating it — by
 * mouse or by keyboard — dispatches a click that bubbles to the card's handler,
 * which is the single entry point. Adding one here would fire the action twice.
 *
 * It has no in-flight state either — no "Opening…", no disabled dimming. The
 * button reads the same before and after a click; the tab that opens is the
 * feedback. Re-entry while a lookup is running is still blocked, but in the
 * hook's `apply` rather than here, so the guard costs the button nothing.
 *
 * The label does not change for signed-out visitors either. Advertising the
 * gate on the button ("Create free account to apply") priced the sign-up before
 * the role; the offer is the vacancy, and the account is a step on the way to
 * it. Signed out, the click still lands on JobSignupModal — the gate moved, it
 * did not go away.
 */
export function ApplyButton({ className = '' }: ApplyButtonProps) {
  return (
    <button
      type="button"
      /* Grey plate, black label, no colour change on hover — the card's own
         shadow and lift already answer the cursor, and the arrow's motion marks
         the button itself. Strokes below are currentColor, so they stay black
         with the label. */
      className={`inline-flex items-center justify-center gap-1 bg-[#F6F6F6] text-black text-sm font-medium rounded-[6px] cursor-pointer ${className}`}
      style={{
        fontFamily: 'var(--font-geist-sans), sans-serif',
        letterSpacing: '-0.01em',
        padding: '7px 12px',
      }}
    >
      Apply
      {/* The /progress share glyph — an arrow rising out of a tray, same paths
          and stroke weight as IntroSection's ShareButton.

          The arrow lifts out of the tray and settles back — /progress holds its
          arrow up for as long as you hover; here it bobs once and returns. The
          tray never moves. Driven by group-hover, so the whole card triggers it
          rather than just the button; the class being added on enter and removed
          on leave is what replays it each pass. */}
      {/* overflow-visible is load-bearing, not tidying. The arrow's tip sits at
          y=2 once the round cap is counted, and the bob lifts it 4 more, so at
          the peak it is 2 units above a viewBox that starts at 0 — and an SVG
          viewport clips to itself by default, which sheared the point flat.
          Growing the viewBox instead would shrink the icon at a fixed 16px. */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
        <g className="group-hover:animate-[shareArrowBob_1.1s_ease-in-out_infinite]">
          <path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
