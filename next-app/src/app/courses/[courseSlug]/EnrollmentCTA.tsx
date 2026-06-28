'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import type { User } from '@supabase/supabase-js'
import { enrollUserInCourse, registerInterestForUser } from '@/lib/enroll'
import ShareButtons from './ShareButtons'

interface EnrollmentCTAProps {
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}

function extractFirstName(user: { user_metadata?: Record<string, string>; email?: string }) {
  return user.user_metadata?.first_name
    || user.user_metadata?.full_name?.split(' ')[0]
    || user.user_metadata?.name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'your'
}

export default function EnrollmentCTA({ courseSlug, courseTitle, isComingSoon }: EnrollmentCTAProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savingAction, setSavingAction] = useState<'adding' | 'removing' | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showButton, setShowButton] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const handlingSignInRef = useRef(false)

  // Handle Google sign-in success (direct, no redirect)
  const handleGoogleSuccess = useCallback(async (credential: string, nonce: string) => {
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce: nonce,
      })

      if (authError || !data.user) {
        console.error('[EnrollmentCTA] Google sign-in failed:', authError)
        return
      }

      setUser(data.user)
      setFirstName(extractFirstName(data.user))
      setCheckingStatus(false)

      // Auto-enroll in the course
      await enrollUserInCourse({ supabase, userId: data.user.id, authUser: data.user, courseSlug, courseTitle, isComingSoon })
      setIsSaved(true)
    } catch (err) {
      console.error('[EnrollmentCTA] Unexpected error:', err)
    }
  }, [courseSlug, courseTitle, isComingSoon])

  const { triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: authLoaded && !user,
    autoPrompt: true,
  })

  // Handle Google OAuth redirect fallback (when One Tap is blocked)
  const handleGoogleOAuthFallback = useCallback(async () => {
    sessionStorage.setItem('pendingEnrollCourse', courseSlug)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    })
  }, [courseSlug])

  // Handle LinkedIn sign-in (OAuth redirect)
  const handleLinkedInClick = useCallback(async () => {
    sessionStorage.setItem('pendingEnrollCourse', courseSlug)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    })
  }, [courseSlug])

  // Trigger fade-in after checkingStatus resolves
  useEffect(() => {
    if (!checkingStatus) {
      requestAnimationFrame(() => setShowButton(true))
    }
  }, [checkingStatus])

  // Handle user sign-in: check pending enrollment + saved course status
  const handleUserSignedIn = useCallback(async (signedInUser: User) => {
    if (handlingSignInRef.current) return
    handlingSignInRef.current = true

    try {
      const supabase = createClient()
      setUser(signedInUser)
      setFirstName(extractFirstName(signedInUser))

      // Check for pending enrollment (LinkedIn or Google OAuth redirect)
      const pendingSlug = sessionStorage.getItem('pendingEnrollCourse')
      if (pendingSlug === courseSlug) {
        sessionStorage.removeItem('pendingEnrollCourse')
        await enrollUserInCourse({ supabase, userId: signedInUser.id, authUser: signedInUser, courseSlug, courseTitle, isComingSoon })
        setIsSaved(true)
        setCheckingStatus(false)
        setAuthLoaded(true)
        return
      }

      // Check if course is already saved
      const { data } = await supabase
        .from('saved_courses')
        .select('id')
        .eq('user_id', signedInUser.id)
        .eq('course_id', courseSlug)
        .maybeSingle()
      setIsSaved(!!data)
      setCheckingStatus(false)
      setAuthLoaded(true)
    } finally {
      handlingSignInRef.current = false
    }
  }, [courseSlug, courseTitle, isComingSoon])

  // Initial auth check + OAuth callback detection
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        await handleUserSignedIn(user)
      } else {
        setCheckingStatus(false)
        setAuthLoaded(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleUserSignedIn(session.user)
      } else {
        setUser(null)
        setFirstName(null)
        setIsSaved(false)
        setCheckingStatus(false)
        setAuthLoaded(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [courseSlug, handleUserSignedIn])

  const handleSaveToggle = async () => {
    if (!user) return
    const action = isSaved ? 'removing' : 'adding'
    setSavingAction(action)
    setIsSaving(true)

    const minDelay = new Promise(resolve => setTimeout(resolve, 750))

    try {
      const supabase = createClient()
      if (action === 'removing') {
        // Check if this is the user's currently enrolled course
        const { data: userData } = await supabase
          .from('users')
          .select('enrolled_course')
          .eq('id', user.id)
          .maybeSingle()

        if (userData?.enrolled_course === courseSlug) {
          alert('This is your current course. Switch to a different course in Settings first.')
          setIsSaving(false)
          setSavingAction(null)
          return
        }

        await Promise.all([
          supabase
            .from('saved_courses')
            .delete()
            .eq('user_id', user.id)
            .eq('course_id', courseSlug),
          minDelay,
        ])
        setIsSaved(false)

        // Remove waitlist entry for coming-soon courses
        if (isComingSoon) {
          await supabase
            .from('course_requests')
            .delete()
            .eq('user_id', user.id)
            .eq('course_name', courseSlug)
        }
      } else {
        // Save the course
        await Promise.all([
          supabase
            .from('saved_courses')
            .insert({ user_id: user.id, course_id: courseSlug }),
          minDelay,
        ])
        setIsSaved(true)

        // Register interest for coming-soon courses
        if (isComingSoon) {
          await registerInterestForUser(supabase, user.id, courseSlug)
        }

        // Auto-enroll if user has no enrolled course and this is a live course
        if (!isComingSoon) {
          const { data: userData } = await supabase
            .from('users')
            .select('enrolled_course')
            .eq('id', user.id)
            .maybeSingle()

          if (!userData) {
            // No user record — create one, then enroll
            const metadata = user.user_metadata || {}
            const fn = metadata.first_name || metadata.given_name || metadata.full_name?.split(' ')[0] || ''
            const ln = metadata.last_name || metadata.family_name || metadata.full_name?.split(' ').slice(1).join(' ') || ''
            await supabase.from('users').insert({
              id: user.id,
              first_name: fn,
              last_name: ln,
              enrolled_course: courseSlug,
              onboarding_completed: true,
              role: 'student',
            })
            sessionStorage.removeItem('enrollment_status_cache')
          } else if (!userData.enrolled_course) {
            await supabase
              .from('users')
              .update({
                enrolled_course: courseSlug,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
            sessionStorage.removeItem('enrollment_status_cache')
          }
        }
      }
    } catch (err) {
      console.error('Error toggling save status:', err)
    } finally {
      setIsSaving(false)
      setSavingAction(null)
    }
  }

  return (
    <div className="w-full">
        {!authLoaded ? (
          <div className="w-[80%] mx-auto mb-4" style={{ minHeight: '95px' }} />
        ) : !user ? (
          <>
            {/* Sign-in buttons */}
            <div className="space-y-2 w-[85%] mx-auto mb-4">
              {/* Continue with Google button */}
              <button
                onClick={() => triggerPrompt(handleGoogleOAuthFallback)}
                className="mx-auto flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)]"
                style={{ width: '100%', height: '40px' }}
              >
                Continue with Google
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Google_Favicon_2025.png" alt="Google" width="17.5" height="17.5" style={{ width: '17.5px', height: '17.5px', marginTop: '-3px' }} />
              </button>

              {/* LinkedIn Sign In Button */}
              <button
                onClick={handleLinkedInClick}
                className="mx-auto flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)]"
                style={{ width: '100%', height: '40px' }}
              >
                Continue with LinkedIn
                <svg width="21" height="21" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-2px' }}>
                  <path fill="#0A66C2" d="M60.67 6H11.33A5.33 5.33 0 006 11.33v49.34A5.33 5.33 0 0011.33 66h49.34A5.33 5.33 0 0066 60.67V11.33A5.33 5.33 0 0060.67 6zM24.29 56H15.7V29.12h8.59V56zM20 25.46a4.97 4.97 0 110-9.94 4.97 4.97 0 010 9.94zM56 56h-8.59V42.93c0-3.12-.06-7.13-4.34-7.13-4.35 0-5.01 3.39-5.01 6.9V56h-8.59V29.12h8.24v3.67h.12a9.03 9.03 0 018.12-4.46c8.69 0 10.29 5.72 10.29 13.15V56z"/>
                </svg>
              </button>
            </div>

            {/* Status Text */}
            <p className="text-center text-black text-base font-normal mb-4" style={{ letterSpacing: '-0.03em' }}>
              {isComingSoon ? 'Sign in to join the course waitlist' : 'Sign in to start the course'}
            </p>
          </>
        ) : (
          <>
            {/* Save to Account Button for authenticated users */}
            <div className="w-[80%] mx-auto mb-4">
              <div style={{ minHeight: '40px' }}>
                <button
                  onClick={handleSaveToggle}
                  disabled={isSaving || checkingStatus}
                  className={`w-full px-4 shadow-none hover:shadow-[0_0_14px_rgba(103,103,103,0.6)] ${
                    isSaving
                      ? savingAction === 'removing'
                        ? 'bg-[#009600] text-white'
                        : 'bg-[#EF0B72] text-white'
                      : isSaved
                      ? 'bg-[#009600] text-white'
                      : 'bg-[#EF0B72] text-white'
                  } disabled:cursor-not-allowed`}
                  style={{
                    paddingTop: '0.575rem',
                    paddingBottom: '0.575rem',
                    borderRadius: '8px',
                    transition: 'opacity 0.5s ease, box-shadow 0.35s ease-in-out, background-color 0.3s ease',
                    opacity: checkingStatus ? 0 : (isSaving ? 1 : (showButton ? 1 : 0)),
                  }}
                >
                  {isSaving ? (
                    <span className="inline-flex items-center justify-center text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>
                      {(savingAction === 'removing' ? 'Removing...' : 'Adding...').split('').map((char, i) => (
                        <span
                          key={i}
                          style={{
                            animation: 'letterFadeIn 0.4s ease forwards',
                            animationDelay: `${i * 0.03}s`,
                            opacity: 0,
                          }}
                        >{char === ' ' ? '\u00A0' : char}</span>
                      ))}
                    </span>
                  ) : isSaved ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                        Saved to Account
                      </span>
                    </span>
                  ) : (
                    <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                      Add to {firstName || 'your'}&apos;s Account
                    </span>
                  )}
                </button>
              </div>

              <p
                className="text-center text-black text-base font-normal mt-3"
                style={{
                  letterSpacing: '-0.03em',
                  textWrap: 'balance',
                  minHeight: '1.5em',
                  opacity: showButton ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                }}
              >
                {(() => {
                  const effectivelySaved = isSaving ? savingAction === 'removing' : isSaved
                  return effectivelySaved
                    ? isComingSoon
                      ? `We'll notify you when ${courseTitle} is available`
                      : <>To get started,<br />{`head to ${firstName || 'your'}'s account`}</>
                    : isComingSoon
                      ? 'Join the course waitlist'
                      : "We'll save this course to start later"
                })()}
              </p>
            </div>
          </>
        )}

        {/* Share Buttons Row */}
        <ShareButtons courseSlug={courseSlug} courseTitle={courseTitle} />
    </div>
  )
}
