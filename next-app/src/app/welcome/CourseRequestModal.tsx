'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import { createClient } from '@/lib/supabase/client'

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
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [lockedSize, setLockedSize] = useState<{ width: number; height: number } | null>(null)

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

  const { isLoaded, renderButton } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: phase === 'sign-in',
    autoPrompt: false,
  })

  useEffect(() => {
    if (phase === 'sign-in' && isLoaded && googleBtnRef.current) {
      renderButton(googleBtnRef.current, {
        width: 380,
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
      })
    }
  }, [phase, isLoaded, renderButton])

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
              {/* Google personalized button (rendered by Google's GIS) */}
              <div
                ref={googleBtnRef}
                className="mx-auto rounded overflow-hidden"
                style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
              />

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
          <div className="flex-1 flex flex-col items-center justify-center" style={{ marginBottom: '-2.75rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-4">
              <circle cx="12" cy="12" r="11" stroke="#22C55E" strokeWidth="2" />
              <path d="M7 12.5l3 3 7-7" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p
              className="text-black text-center text-[1.1rem] font-semibold tracking-[-0.02em] leading-tight"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              Thank you, {userName}<br /><span className="font-medium">We&rsquo;ll be in touch soon</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
