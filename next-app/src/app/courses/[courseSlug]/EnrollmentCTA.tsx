'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import ShareButtons from './ShareButtons'

interface EnrollmentCTAProps {
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}

export default function EnrollmentCTA({ courseSlug, courseTitle, isComingSoon }: EnrollmentCTAProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [interestEmail, setInterestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        setFirstName(user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0])
        // Check if course is saved
        supabase
          .from('saved_courses')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_slug', courseSlug)
          .maybeSingle()
          .then(({ data }) => {
            setIsSaved(!!data)
            setCheckingStatus(false)
          })
      } else {
        setCheckingStatus(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setFirstName(session.user.user_metadata?.first_name || session.user.user_metadata?.name?.split(' ')[0])
      } else {
        setFirstName(null)
        setIsSaved(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [courseSlug])

  const handleSignIn = (provider: string) => {
    setLoadingProvider(provider)

    // Store enrollment intent then redirect to Vite app sign-in
    const intent = isComingSoon ? 'pendingWaitlistCourse' : 'pendingEnrollmentCourse'
    const redirectUrl = `https://ignite.education/sign-in?provider=${provider}&${intent}=${courseSlug}`
    window.location.href = redirectUrl
  }

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
            {/* Google Sign In Button */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={!!loadingProvider}
              className="flex items-center justify-center gap-2 w-[90%] mx-auto px-4 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 mb-3 shadow-[0_0_12px_rgba(103,103,103,0.25)]"
              style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
            >
              {loadingProvider === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-[1rem] text-black font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                    Continue with Google
                  </span>
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/Screenshot%202026-01-10%20at%2013.00.44.png"
                    alt="Google"
                    className="w-5 h-5 flex-shrink-0"
                  />
                </>
              )}
            </button>

            {/* LinkedIn Sign In Button */}
            <button
              onClick={() => handleSignIn('linkedin_oidc')}
              disabled={!!loadingProvider}
              className="flex items-center justify-center gap-2 w-[90%] mx-auto px-4 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 mb-4 shadow-[0_0_12px_rgba(103,103,103,0.25)]"
              style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
            >
              {loadingProvider === 'linkedin_oidc' ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-[1rem] text-black font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                    Continue with LinkedIn
                  </span>
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/Screenshot%202026-01-10%20at%2013.01.02%20(1).png"
                    alt="LinkedIn"
                    className="w-5 h-5 flex-shrink-0"
                  />
                </>
              )}
            </button>

            {/* Status Text */}
            <p className="text-center text-black text-sm font-light mb-4" style={{ letterSpacing: '-0.02em' }}>
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
