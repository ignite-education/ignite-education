'use client'

import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'

/**
 * The sign-up prompt shown when a signed-out visitor clicks Apply.
 *
 * A modal rather than a redirect to /sign-in on purpose: this is the exact
 * moment the visitor has intent, and bouncing them to another page loses their
 * scroll position, their filters and the job they were looking at. One Tap
 * resolves without navigating at all, so in the best case they never leave.
 *
 * Both OAuth redirect paths carry `next` back to this job, so the fallback
 * still lands them where they started. SignInForm already reads `next`.
 */

interface JobSignupModalProps {
  jobTitle: string
  company: string
  /** Where to come back to after an OAuth round trip. */
  returnPath: string
  onClose: () => void
  /** Fired when One Tap signs the user in without navigating. */
  onSignedIn: () => void
}

export default function JobSignupModal({
  jobTitle,
  company,
  returnPath,
  onClose,
  onSignedIn,
}: JobSignupModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    // Prevent the board scrolling behind the modal.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleGoogleSuccess = useCallback(
    async (credential: string, nonce: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce,
      })
      if (error || !data.user) {
        console.error('[JobSignupModal] Google sign-in failed:', error)
        return
      }
      onSignedIn()
    },
    [onSignedIn]
  )

  const { triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: true,
    autoPrompt: false,
  })

  const redirectTo = useCallback(
    () => `${window.location.origin}/auth/callback?${new URLSearchParams({ next: returnPath })}`,
    [returnPath]
  )

  const handleGoogleFallback = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
  }, [redirectTo])

  const handleLinkedIn = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: redirectTo() } })
  }, [redirectTo])

  const buttonClass =
    'flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer w-full'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create a free account to apply"
    >
      <div
        className="bg-white rounded-[12px] w-full max-w-[420px] p-7 relative"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-black/35 hover:text-black transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2
          className="text-black font-bold tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.35rem', lineHeight: 1.25 }}
        >
          Create a free account to apply
        </h2>

        <p
          className="text-black/70 font-light mt-2"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.45 }}
        >
          We&apos;ll take you straight to <span className="font-medium text-black">{jobTitle}</span> at{' '}
          <span className="font-medium text-black">{company}</span>. Free, and it takes about ten seconds.
        </p>

        <div className="space-y-2 mt-5">
          <button
            onClick={() => triggerPrompt(handleGoogleFallback)}
            className={`${buttonClass} border border-[#E5E5E5] hover:border-[#8200EA]`}
            style={{ height: '44px' }}
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

          <button
            onClick={handleLinkedIn}
            className={`${buttonClass} border border-[#E5E5E5] hover:border-[#8200EA]`}
            style={{ height: '44px' }}
          >
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
          className="text-center text-black/45 mt-4"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.78rem', letterSpacing: '-0.01em' }}
        >
          Prefer email?{' '}
          <a href={`/sign-in?next=${encodeURIComponent(returnPath)}`} className="underline hover:text-[#EF0B72] transition-colors">
            Sign in on a full page
          </a>
        </p>
      </div>
    </div>
  )
}
