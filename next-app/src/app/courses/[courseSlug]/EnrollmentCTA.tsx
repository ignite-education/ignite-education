'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import { saveGoogleProfileHint, getGoogleProfileHint, clearGoogleProfileHint, type GoogleProfileHint } from '@/lib/googleProfileHint'
import type { User } from '@supabase/supabase-js'
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
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [interestEmail, setInterestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [googleHint, setGoogleHint] = useState<GoogleProfileHint | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Check for stored Google profile on mount
  useEffect(() => {
    setGoogleHint(getGoogleProfileHint())
  }, [])

  // Save course for a given user
  const saveCourseForUser = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('saved_courses')
      .select('id')
      .eq('user_id', userId)
      .eq('course_slug', courseSlug)
      .maybeSingle()

    if (!existing) {
      await supabase
        .from('saved_courses')
        .insert({ user_id: userId, course_slug: courseSlug })
    }
    setIsSaved(true)
  }, [courseSlug])

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

      // Save Google profile for future personalization (Safari etc.)
      saveGoogleProfileHint(data.user)

      setUser(data.user)
      setFirstName(extractFirstName(data.user))
      setCheckingStatus(false)

      // Auto-save the course
      await saveCourseForUser(data.user.id)
    } catch (err) {
      console.error('[EnrollmentCTA] Unexpected error:', err)
    }
  }, [saveCourseForUser])

  const { isLoaded, renderButton, triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: !user,
    autoPrompt: false,
    loginHint: googleHint?.email,
  })

  // Render Google GIS button when ready (only for first-time users without stored profile)
  useEffect(() => {
    if (!user && !googleHint && isLoaded && googleBtnRef.current) {
      renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
      })
    }
  }, [user, googleHint, isLoaded, renderButton])

  // Handle custom personalized Google button click
  const handlePersonalizedGoogleClick = useCallback(() => {
    // Try One Tap prompt first (works on Chrome)
    triggerPrompt(() => {
      // Prompt was blocked (Safari ITP) — fall back to OAuth redirect
      sessionStorage.setItem('pendingSaveCourse', courseSlug)
      const supabase = createClient()
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
          queryParams: googleHint?.email ? { login_hint: googleHint.email } : undefined,
        },
      })
    })
  }, [triggerPrompt, courseSlug, googleHint])

  // Handle "Not [Name]?" — clear stored profile, show standard GIS button
  const handleClearGoogleHint = useCallback(() => {
    clearGoogleProfileHint()
    setGoogleHint(null)
  }, [])

  // Handle LinkedIn sign-in (OAuth redirect)
  const handleLinkedInClick = useCallback(async () => {
    sessionStorage.setItem('pendingSaveCourse', courseSlug)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: window.location.href,
      },
    })
  }, [courseSlug])

  // Initial auth check + OAuth callback detection
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        setFirstName(extractFirstName(user))

        // Check for pending save (LinkedIn or Google OAuth redirect)
        const pendingSlug = sessionStorage.getItem('pendingSaveCourse')
        if (pendingSlug === courseSlug) {
          sessionStorage.removeItem('pendingSaveCourse')
          await saveCourseForUser(user.id)
          setCheckingStatus(false)
          return
        }

        // Check if course is already saved
        const { data } = await supabase
          .from('saved_courses')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_slug', courseSlug)
          .maybeSingle()
        setIsSaved(!!data)
        setCheckingStatus(false)
      } else {
        setCheckingStatus(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setFirstName(extractFirstName(session.user))
      } else {
        setFirstName(null)
        setIsSaved(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [courseSlug, saveCourseForUser])

  const handleSaveToggle = async () => {
    if (!user) return
    setIsSaving(true)

    try {
      const supabase = createClient()
      if (isSaved) {
        await supabase
          .from('saved_courses')
          .delete()
          .eq('user_id', user.id)
          .eq('course_slug', courseSlug)
        setIsSaved(false)
      } else {
        await supabase
          .from('saved_courses')
          .insert({ user_id: user.id, course_slug: courseSlug })
        setIsSaved(true)
      }
    } catch (err) {
      console.error('Error toggling save status:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegisterInterest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('course_requests')
        .insert({ email: interestEmail, course_name: courseSlug })

      if (error && error.code !== '23505') {
        console.error('Error registering interest:', error)
        alert('Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => {
    setShowInterestModal(false)
    setInterestEmail('')
    setSubmitted(false)
  }

  return (
    <>
      <div className="w-full">
        {!user ? (
          <>
            {/* Sign-in buttons */}
            <div className="space-y-2 w-[90%] mx-auto mb-3">
              {googleHint ? (
                <>
                  {/* Custom personalized Google button (for returning users) */}
                  <button
                    onClick={handlePersonalizedGoogleClick}
                    className="mx-auto flex items-center bg-white border border-[#dadce0] rounded text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                    style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
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
                  style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                />
              )}

              {/* LinkedIn Sign In Button */}
              <button
                onClick={handleLinkedInClick}
                className="mx-auto flex items-center bg-[#0077B5] text-white rounded text-sm hover:bg-[#006097] transition font-medium cursor-pointer"
                style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
              >
                <span className="flex-1 text-center">Continue with LinkedIn</span>
                <div className="flex items-center justify-center bg-white/20" style={{ width: '40px', height: '40px', borderRadius: '0 4px 4px 0' }}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
              </button>
            </div>

            {/* Status Text */}
            <p className="text-center text-black text-sm font-normal mb-4" style={{ letterSpacing: '-0.02em' }}>
              {isComingSoon ? 'Sign in to join the course waitlist' : 'Sign in to start the course'}
            </p>
          </>
        ) : (
          <>
            {/* Save to Account Button for authenticated users */}
            <div className="w-[80%] mx-auto mb-4">
              <button
                onClick={handleSaveToggle}
                disabled={isSaving || checkingStatus}
                className={`w-full px-4 transition-all duration-200 shadow-[0_0_10px_rgba(103,103,103,0.4)] ${
                  isSaved
                    ? 'bg-gray-200 text-black hover:bg-gray-300'
                    : 'bg-[#EF0B72] text-white hover:bg-[#D10A64]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
              >
                {checkingStatus ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>Loading...</span>
                  </span>
                ) : isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>
                      {isSaved ? 'Removing...' : 'Saving...'}
                    </span>
                  </span>
                ) : isSaved ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                      Saved to {firstName || 'your'}&apos;s Account
                    </span>
                  </span>
                ) : (
                  <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                    Add to {firstName || 'your'}&apos;s Account
                  </span>
                )}
              </button>

              <p className="text-center text-black text-sm font-light mt-3" style={{ letterSpacing: '-0.02em' }}>
                {isSaved ? 'Course saved to your account' : "We'll save this course to start later"}
              </p>
            </div>
          </>
        )}

        {/* Share Buttons Row */}
        <ShareButtons courseSlug={courseSlug} courseTitle={courseTitle} />
      </div>

      {/* Register Interest Modal (for coming_soon courses) */}
      {showInterestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={closeModal}
        >
          <div className="relative px-4 sm:px-0" style={{ width: '100%', maxWidth: '484px' }}>
            <h3 className="font-semibold text-white pl-1" style={{ marginBottom: '0.15rem', fontSize: '1.35rem' }}>
              Register Interest
            </h3>

            <div
              className="bg-white rounded-lg w-full relative"
              style={{ padding: '1.8rem 2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">You&apos;re on the list!</h4>
                  <p className="text-sm text-gray-600">
                    We&apos;ll notify you when {courseTitle} launches.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-5 text-sm" style={{ color: '#000000' }}>
                    Be the first to know when <strong>{courseTitle}</strong> launches. Enter your email to get notified.
                  </p>

                  <form onSubmit={handleRegisterInterest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Email</label>
                      <input
                        type="email"
                        required
                        value={interestEmail}
                        onChange={(e) => setInterestEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors mt-1 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Notify Me'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
