'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'

/**
 * Signed-out sign-up block for the black job-board hero.
 *
 * The same two OAuth buttons as ProfileAuthCTA and the course pages'
 * EnrollmentCTA, minus anything course-specific. Rendered only once auth has
 * resolved to "signed out" — JobBoardClient owns that decision so the whole
 * board shares a single auth subscription.
 *
 * This is the same conversion the Apply gate performs, offered up front: a
 * visitor who signs up here can then click through to any vacancy without
 * hitting the modal at all.
 *
 * Google goes through One Tap first and falls back to the OAuth redirect when
 * the prompt is blocked. Both providers return here via /auth/callback?next=.
 */
export default function JobAuthCTA({ onSignedIn }: { onSignedIn?: () => void }) {
  const handleGoogleSuccess = useCallback(
    async (credential: string, nonce: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce,
      })
      if (error || !data.user) {
        console.error('[JobAuthCTA] Google sign-in failed:', error)
        return
      }
      onSignedIn?.()
    },
    [onSignedIn]
  )

  const { triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: true,
    // No autoPrompt: an unsolicited One Tap overlay on arrival would cover the
    // hero, and the board is a page people land on from search.
    autoPrompt: false,
  })

  // Return to the board itself, preserving whichever profession page they are on.
  const redirectTo = useCallback(() => {
    const params = new URLSearchParams({ next: window.location.pathname })
    return `${window.location.origin}/auth/callback?${params.toString()}`
  }, [])

  const handleGoogleFallback = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
  }, [redirectTo])

  const handleLinkedInClick = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: redirectTo() } })
  }, [redirectTo])

  const buttonClass =
    'flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer btn-glow-on-dark'

  return (
    <div className="w-full lg:w-[268px] shrink-0">
      <div className="space-y-2">
        <button
          onClick={() => triggerPrompt(handleGoogleFallback)}
          className={buttonClass}
          style={{ width: '100%', height: '40px' }}
        >
          Continue with Google
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Google_Favicon_2025.png"
            alt=""
            width="17.5"
            height="17.5"
            style={{ width: '17.5px', height: '17.5px', marginTop: '-3px' }}
          />
        </button>

        <button onClick={handleLinkedInClick} className={buttonClass} style={{ width: '100%', height: '40px' }}>
          Continue with LinkedIn
          <svg width="21" height="21" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-2px' }}>
            <path
              fill="#0A66C2"
              d="M60.67 6H11.33A5.33 5.33 0 006 11.33v49.34A5.33 5.33 0 0011.33 66h49.34A5.33 5.33 0 0066 60.67V11.33A5.33 5.33 0 0060.67 6zM24.29 56H15.7V29.12h8.59V56zM20 25.46a4.97 4.97 0 110-9.94 4.97 4.97 0 010 9.94zM56 56h-8.59V42.93c0-3.12-.06-7.13-4.34-7.13-4.35 0-5.01 3.39-5.01 6.9V56h-8.59V29.12h8.24v3.67h.12a9.03 9.03 0 018.12-4.46c8.69 0 10.29 5.72 10.29 13.15V56z"
            />
          </svg>
        </button>
      </div>

      <p
        className="text-center text-white font-normal mt-4"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.03em', lineHeight: 1.35 }}
      >
        Create your free<br />account to apply
      </p>
    </div>
  )
}
