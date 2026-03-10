'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
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

function extractAvatar(user: { user_metadata?: Record<string, string> }) {
  const meta = user.user_metadata ?? {}
  return meta.custom_avatar_url || meta.avatar_url || meta.picture || ''
}

export default function CourseRequestModal({ courseName, onClose, initialPhase = 'sign-in', initialUserName }: CourseRequestModalProps) {
  const [closing, setClosing] = useState(false)
  const [phase, setPhase] = useState<'sign-in' | 'thank-you'>(initialPhase)
  const [userName, setUserName] = useState(initialUserName || '')
  const [checkingAuth, setCheckingAuth] = useState(initialPhase === 'sign-in')
  const [editedCourseName, setEditedCourseName] = useState(courseName)
  const [savedCourseName, setSavedCourseName] = useState(courseName)
  const [isEditing, setIsEditing] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [userAvatar, setUserAvatar] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [inputWidth, setInputWidth] = useState<number | undefined>(undefined)
  const authUserIdRef = useRef<string | null>(null)
  const submittedCourseNameRef = useRef<string>(courseName)

  // Measure the rendered text width and size the input to match (useLayoutEffect to avoid flicker)
  useLayoutEffect(() => {
    if (measureRef.current) {
      setInputWidth(measureRef.current.scrollWidth + 4) // +4 for minimal breathing room
    }
  }, [editedCourseName, isEditing])

  // If user is already signed in, submit the request immediately
  useEffect(() => {
    if (initialPhase !== 'sign-in') return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setCheckingAuth(false)
        return
      }
      authUserIdRef.current = user.id
      submittedCourseNameRef.current = editedCourseName
      const { error } = await supabase.from('course_requests').insert({
        user_id: user.id,
        course_name: editedCourseName,

      })
      if (error) {
        console.error('[CourseRequest] Auto-insert failed:', error.message, error.code)
      } else {
        console.log('[CourseRequest] Auto-insert succeeded for:', editedCourseName)
      }
      setCheckingAuth(false)
      setUserName(extractFirstName(user))
      setUserAvatar(extractAvatar(user))
      setPhase('thank-you')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startSigningIn = useCallback(() => {
    setSigningIn(true)
  }, [])

  const lockAndTransition = (firstName: string, avatar: string) => {
    setCheckingAuth(false)
    setUserName(firstName)
    setUserAvatar(avatar)
    setPhase('thank-you')
  }

  const openOAuthPopup = useCallback(async (
    provider: 'google' | 'linkedin_oidc',
    queryParams?: Record<string, string>
  ) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
        ...(queryParams ? { queryParams } : {}),
      },
    })

    if (error || !data?.url) {
      // Popup approach failed — fall back to redirect
      sessionStorage.setItem('pendingCourseRequest', editedCourseName)
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.href },
      })
      return
    }

    const w = 500, h = 600
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(data.url, 'auth-popup', `width=${w},height=${h},left=${left},top=${top}`)

    if (!popup) {
      // Popup blocked — fall back to redirect
      sessionStorage.setItem('pendingCourseRequest', editedCourseName)
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.href },
      })
      return
    }

    // Poll for auth completion
    const interval = setInterval(async () => {
      if (popup.closed) {
        clearInterval(interval)
        setSigningIn(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        clearInterval(interval)
        popup.close()
        // Refresh session so onAuthStateChange fires in the Navbar
        await supabase.auth.refreshSession()
        authUserIdRef.current = user.id
        submittedCourseNameRef.current = editedCourseName
        await supabase.from('course_requests').insert({
          user_id: user.id,
          course_name: editedCourseName,
  
        })
        lockAndTransition(extractFirstName(user), extractAvatar(user))
      }
    }, 500)
  }, [editedCourseName])

  const handleGoogleSuccess = useCallback(async (credential: string, nonce: string) => {
    startSigningIn()
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

      authUserIdRef.current = data.user.id
      submittedCourseNameRef.current = editedCourseName

      const { error: insertError } = await supabase.from('course_requests').insert({
        user_id: data.user.id,
        course_name: editedCourseName,

      })

      if (insertError) {
        console.error('[CourseRequest] Insert failed:', insertError.message, insertError.code, insertError)
      } else {
        console.log('[CourseRequest] Insert succeeded for:', editedCourseName)
      }

      lockAndTransition(extractFirstName(data.user), extractAvatar(data.user))
    } catch (err) {
      console.error('[CourseRequest] Unexpected error:', err)
    }
  }, [editedCourseName])

  const handleLinkedInClick = useCallback(async () => {
    startSigningIn()
    openOAuthPopup('linkedin_oidc')
  }, [editedCourseName, openOAuthPopup])

  const handleGoogleClick = useCallback(() => {
    startSigningIn()
    openOAuthPopup('google')
  }, [openOAuthPopup])

  // Save edited course name — update Supabase if already submitted
  const handleEditSave = useCallback(async () => {
    const trimmed = editedCourseName.trim()
    const newName = trimmed || courseName
    setEditedCourseName(newName)
    setSavedCourseName(newName)
    setIsEditing(false)

    if (phase === 'thank-you' && authUserIdRef.current && newName !== submittedCourseNameRef.current) {
      const supabase = createClient()
      const { error } = await supabase
        .from('course_requests')
        .update({ course_name: newName })
        .eq('user_id', authUserIdRef.current)
        .eq('course_name', submittedCourseNameRef.current)
      if (error) {
        console.error('[CourseRequest] Update failed:', error.message, error.code)
      } else {
        console.log('[CourseRequest] Updated course name from', submittedCourseNameRef.current, 'to', newName)
        submittedCourseNameRef.current = newName
      }
    }
  }, [editedCourseName, courseName, phase])

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 250)
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
        className={`relative bg-white flex flex-col ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        style={{
          width: 'fit-content',
          height: '350px',
          minWidth: '575px',
          maxWidth: '90vw',
          padding: '0 2.75rem',
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

        {/* Top section — 35% height, vertically centered */}
        <div className="flex items-end justify-center" style={{ flex: '0 0 35%' }}>
        <h3
          className="text-[1.65rem] font-bold text-black text-center leading-tight tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          <span className="whitespace-nowrap">We&rsquo;ve added{' '}
            {/* Hidden span to measure exact text width */}
            <span
              ref={measureRef}
              className="text-[1.65rem] font-bold leading-tight tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif', position: 'absolute', visibility: 'hidden', whiteSpace: 'pre' }}
            >{editedCourseName.replace(/\b\w/g, c => c.toUpperCase())}</span>
            <span className="relative inline-flex items-baseline" style={{ height: '2.0625rem', verticalAlign: 'baseline' }}>
              {isEditing ? (
                <>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editedCourseName.replace(/\b\w/g, c => c.toUpperCase())}
                    onChange={(e) => setEditedCourseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave()
                    }}
                    className="text-[#EF0B72] text-[1.65rem] font-bold leading-[0.9] tracking-[-0.02em] bg-gray-200/40 rounded outline-none text-center"
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif', width: inputWidth ? `calc(${inputWidth}px + 1rem)` : 'auto', paddingLeft: '0.4rem', paddingRight: '0.4rem', paddingTop: '0.15rem', paddingBottom: '0.15rem', height: 'auto' }}
                  />
                  <button
                    onClick={handleEditSave}
                    className="text-gray-400 hover:text-[#EF0B72] transition-colors absolute focus:outline-none"
                    style={{ right: '-20px', top: '-6px' }}
                    title="Save"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[#EF0B72]">{editedCourseName.replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setTimeout(() => editInputRef.current?.focus(), 0)
                    }}
                    className="text-gray-400 hover:text-[#EF0B72] transition-colors absolute focus:outline-none"
                    style={{ right: '-20px', top: '-6px' }}
                    title="Edit course name"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                </>
              )}
            </span>
          </span>
          <br /><span className="whitespace-nowrap">to our upcoming course list</span>
        </h3>
        </div>

        {/* Bottom section — 65% height, vertically centered */}
        <div className="flex flex-col items-center justify-center" style={{ flex: '0 0 65%', paddingBottom: '10px' }}>
          {checkingAuth ? (
            /* Loading spinner while checking auth */
            <div className="flex items-center justify-center">
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          ) : phase === 'sign-in' ? (
            signingIn ? (
              /* Loading spinner while signing in */
              <div className="flex items-center justify-center">
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            ) : (
            <>
              {/* Sign-in buttons */}
              <div className="space-y-2" style={{ width: '375px', maxWidth: '100%' }}>
                <button
                  onClick={handleGoogleClick}
                  className="mx-auto flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)]"
                  style={{ width: '100%', height: '40px' }}
                >
                  Continue with Google
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://auth.ignite.education/storage/v1/object/public/assets/Google_Favicon_2025.png" alt="Google" width="17.5" height="17.5" style={{ width: '17.5px', height: '17.5px', marginTop: '-3px' }} />
                </button>

                <button
                  onClick={handleLinkedInClick}
                  className="mx-auto flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)]"
                  style={{ width: '100%', height: '40px' }}
                >
                  Continue with LinkedIn
                  <svg width="21" height="21" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-4px' }}>
                    <path fill="#0A66C2" d="M60.67 6H11.33A5.33 5.33 0 006 11.33v49.34A5.33 5.33 0 0011.33 66h49.34A5.33 5.33 0 0066 60.67V11.33A5.33 5.33 0 0060.67 6zM24.29 56H15.7V29.12h8.59V56zM20 25.46a4.97 4.97 0 110-9.94 4.97 4.97 0 010 9.94zM56 56h-8.59V42.93c0-3.12-.06-7.13-4.34-7.13-4.35 0-5.01 3.39-5.01 6.9V56h-8.59V29.12h8.24v3.67h.12a9.03 9.03 0 018.12-4.46c8.69 0 10.29 5.72 10.29 13.15V56z"/>
                  </svg>
                </button>
              </div>

              {/* Subtext */}
              <p
                className="text-black text-center mt-6 text-[0.9rem] font-normal tracking-[-0.01em]"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Register now and we&rsquo;ll let you know<br />when <span className="font-semibold">{savedCourseName.replace(/\b\w/g, c => c.toUpperCase())}</span> launches
              </p>
            </>
            )
          ) : (
            /* Thank-you phase */
            <div className="flex gap-5 animate-fadeIn" style={{ height: '75px' }}>
              {userAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatar}
                  alt=""
                  className="object-cover flex-shrink-0"
                  style={{ width: '75px', height: '75px', borderRadius: '6px' }}
                  referrerPolicy="no-referrer"
                />
              )}
              <div
                className="flex flex-col justify-between tracking-[-0.02em] leading-tight"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                <p className="text-[#009600] text-[1.35rem] font-medium">Thank you, {userName}</p>
                <p className="text-black text-[1rem] font-normal">
                  We&rsquo;ll notify you when<br /><span className="font-semibold">{savedCourseName.replace(/\b\w/g, c => c.toUpperCase())}</span> is available
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
