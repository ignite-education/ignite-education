'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import ShareButtons from '@/components/ShareButtons'

/**
 * The signed-out sign-up block for the public profile hero — the same two
 * OAuth buttons the course pages show in EnrollmentCTA, minus everything
 * course-specific (enrollment, saved_courses, waitlists). Rendered only when
 * auth has resolved to "signed out"; ProfileHero owns that decision so there
 * is a single auth subscription for the whole hero.
 *
 * Google goes through One Tap first and falls back to the OAuth redirect when
 * the prompt is blocked, matching EnrollmentCTA. Both providers return to this
 * same profile via /auth/callback?next=.
 */
export default function ProfileAuthCTA({
  onSignedIn,
  profileUrl,
  displayName,
}: {
  onSignedIn: () => void
  profileUrl: string
  displayName: string
}) {
  const handleGoogleSuccess = useCallback(
    async (credential: string, nonce: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce,
      })
      if (error || !data.user) {
        console.error('[ProfileAuthCTA] Google sign-in failed:', error)
        return
      }
      onSignedIn()
    },
    [onSignedIn]
  )

  const { triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: true,
    // No autoPrompt: a profile is a shareable link, so an unsolicited One Tap
    // overlay on arrival would cover the hero. It shows on button click only.
    autoPrompt: false,
  })

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`

  const handleGoogleFallback = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    })
  }, [])

  const handleLinkedInClick = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: redirectTo() },
    })
  }, [])

  const buttonClass =
    'flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer btn-glow-on-dark'

  return (
    // 268px matches the rendered width on the course pages, where EnrollmentCTA
    // sits in the 315px enrollment rail at w-[85%] (315 * 0.85 = 267.75).
    // text-white so the share glyph's `currentColor` renders on the black band,
    // matching how EnrollmentCTA sets it via its onDark prop.
    <div className="w-full text-white" style={{ maxWidth: '268px' }}>
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
          alt="Google"
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

      {/* Caption + share row, same order and spacing as EnrollmentCTA */}
      <p className="text-center text-white text-base font-normal mt-4 mb-4" style={{ letterSpacing: '-0.03em' }}>
        Create your free account
      </p>

      <ShareButtons
        url={profileUrl}
        title={`${displayName} | Ignite Education`}
        shareText={`Check out ${displayName} on Ignite Education`}
      />
    </div>
  )
}
