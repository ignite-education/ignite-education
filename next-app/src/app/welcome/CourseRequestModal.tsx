'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import { createClient } from '@/lib/supabase/client'
import { saveGoogleProfileHint, getGoogleProfileHint, clearGoogleProfileHint, type GoogleProfileHint } from '@/lib/googleProfileHint'

interface CourseRequestModalProps {
  courseName: string
  onClose: () => void
  initialPhase?: 'sign-in' | 'thank-you'
  initialUserName?: string
}

function extractFirstName(user: { user_metadata?: Record<string, string>; email?: string }) {
  return user.user_metadata?.full_name?.split(' ')[0]
    || user.user_metadata?.name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'there'
}

export default function CourseRequestModal({ courseName, onClose, initialPhase = 'sign-in', initialUserName }: CourseRequestModalProps) {
  const [closing, setClosing] = useState(false)
  const [phase, setPhase] = useState<'sign-in' | 'thank-you'>(initialPhase)
  const [userName, setUserName] = useState(initialUserName || '')
  const [googleHint, setGoogleHint] = useState<GoogleProfileHint | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [lockedSize, setLockedSize] = useState<{ width: number; height: number } | null>(null)

  // Check for stored Google profile on mount
  useEffect(() => {
    setGoogleHint(getGoogleProfileHint())
  }, [])

  const lockAndTransition = (firstName: string) => {
    if (modalRef.current) {
      setLockedSize({
        width: modalRef.current.offsetWidth,
        height: modalRef.current.offsetHeight,
      })
    }
    setUserName(firstName)
    setPhase('thank-you')
  }

  const handleGoogleSuccess = useCallback(async (credential: string, nonce: string) => {
    try {
      const supabase = createClient()
      console.log('[CourseRequest] Starting Google sign-in...')
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce: nonce,
      })

      if (authError || !data.user) {
        console.error('[CourseRequest] Google sign-in failed:', authError)
        return
      }
      console.log('[CourseRequest] Signed in as:', data.user.id, data.user.email)

      // Save Google profile for future personalization (Safari etc.)
      saveGoogleProfileHint(data.user)

      const { error: insertError } = await supabase.from('course_requests').insert({
        user_id: data.user.id,
        course_name: courseName,
      })

      if (insertError) {
        console.error('[CourseRequest] Insert failed:', insertError.message, insertError.code, insertError)
      } else {
        console.log('[CourseRequest] Insert succeeded for:', courseName)
      }

      lockAndTransition(extractFirstName(data.user))
    } catch (err) {
      console.error('[CourseRequest] Unexpected error:', err)
    }
  }, [courseName])

  const handleLinkedInClick = useCallback(async () => {
    sessionStorage.setItem('pendingCourseRequest', courseName)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/welcome`,
      },
    })
  }, [courseName])

  const { isLoaded, renderButton, triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: phase === 'sign-in',
    autoPrompt: false,
    loginHint: googleHint?.email,
  })

  // Render GIS button only for first-time users (no stored profile)
  useEffect(() => {
    if (phase === 'sign-in' && !googleHint && isLoaded && googleBtnRef.current) {
      renderButton(googleBtnRef.current, {
        width: 380,
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
      })
    }
  }, [phase, googleHint, isLoaded, renderButton])

  // Handle custom personalized Google button click
  const handlePersonalizedGoogleClick = useCallback(() => {
    triggerPrompt(() => {
      // Prompt was blocked (Safari ITP) — fall back to OAuth redirect
      sessionStorage.setItem('pendingCourseRequest', courseName)
      const supabase = createClient()
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/welcome`,
          queryParams: googleHint?.email ? { login_hint: googleHint.email } : undefined,
        },
      })
    })
  }, [triggerPrompt, courseName, googleHint])

  const handleClearGoogleHint = useCallback(() => {
    clearGoogleProfileHint()
    setGoogleHint(null)
  }, [])

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className={`relative bg-white flex flex-col ${closing ? 'animate-scaleDown' : 'animate-scaleUp'}`}
        style={{
          width: lockedSize ? `${lockedSize.width}px` : 'fit-content',
          height: lockedSize ? `${lockedSize.height}px` : 'auto',
          minWidth: lockedSize ? undefined : '575px',
          maxWidth: '90vw',
          padding: '3.3rem 2.75rem 2.75rem',
          borderRadius: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Heading */}
        <h3
          className="text-[1.65rem] font-bold text-black text-center leading-tight tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          <span className="whitespace-nowrap">We&rsquo;ve added <span className="text-[#EF0B72]">{courseName.replace(/\b\w/g, c => c.toUpperCase())}</span></span>
          <br /><span className="whitespace-nowrap">to our upcoming course list</span>
        </h3>

        {phase === 'sign-in' ? (
          <>
            {/* Sign-in buttons */}
            <div className="space-y-2" style={{ marginTop: '38px' }}>
              {googleHint ? (
                <>
                  {/* Custom personalized Google button (for returning users) */}
                  <button
                    onClick={handlePersonalizedGoogleClick}
                    className="mx-auto flex items-center bg-white border border-[#dadce0] rounded text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                    style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                  >
                    {/* Avatar */}
                    <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      {googleHint.avatar ? (
                        <img
                          src={googleHint.avatar}
                          alt=""
                          className="rounded-full"
                          style={{ width: '24px', height: '24px' }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-medium"
                          style={{ width: '24px', height: '24px' }}
                        >
                          {googleHint.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Name and email */}
                    <div className="flex-1 text-left min-w-0 pr-1">
                      <span className="block text-[13px] font-medium text-[#3c4043] leading-tight truncate">
                        Continue as {googleHint.name}
                      </span>
                      <span className="block text-[11px] text-[#5f6368] leading-tight truncate">
                        {googleHint.email}
                      </span>
                    </div>
                    {/* Google logo */}
                    <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    </div>
                  </button>
                  {/* "Not [Name]?" link */}
                  <p className="text-center">
                    <button
                      onClick={handleClearGoogleHint}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Not {googleHint.name}?
                    </button>
                  </p>
                </>
              ) : (
                /* Standard GIS button (for first-time users) */
                <div
                  ref={googleBtnRef}
                  className="mx-auto rounded overflow-hidden"
                  style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                />
              )}

              <button
                onClick={handleLinkedInClick}
                className="mx-auto flex items-center bg-[#0077B5] text-white rounded text-sm hover:bg-[#006097] transition font-medium cursor-pointer"
                style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
              >
                <span className="flex-1 text-center">Continue with LinkedIn</span>
                <div className="flex items-center justify-center bg-white/20" style={{ width: '40px', height: '40px', borderRadius: '0 4px 4px 0' }}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
              </button>
            </div>

            {/* Subtext */}
            <p
              className="text-black text-center mt-6 text-[0.95rem] font-medium tracking-[-0.01em]"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              Register and we&rsquo;ll let<br />you know when it launches
            </p>
          </>
        ) : (
          /* Thank-you phase */
          <div className="flex-1 flex flex-col items-center justify-center" style={{ marginBottom: '-2.75rem', marginTop: '-20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-4">
              <circle cx="12" cy="12" r="11" stroke="#2B8A1A" strokeWidth="2" />
              <path d="M7 12.5l3 3 7-7" stroke="#2B8A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p
              className="text-[#2B8A1A] text-center text-[1.1rem] font-semibold tracking-[-0.02em] leading-tight"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              Thank you, {userName}<br /><span className="font-medium text-black">We&rsquo;ll be in touch soon</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
