'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createUserRecord, addToResendAudience } from '@/lib/auth'
import useTypingAnimation from '@/hooks/useTypingAnimation'
import Footer from '@/components/Footer'

export default function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Form state
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset password modal state
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Show error from OAuth callback failure
  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  // Typing animation for tagline
  const taglineText = "Upskill. Reskill.Get ready for what's next."
  const { displayText: typedTagline } = useTypingAnimation(taglineText, {
    charDelay: 90,
    startDelay: 700,
    pausePoints: [
      { after: 8, duration: 500 },
      { after: 17, duration: 500 },
      { after: taglineText.length, duration: 500 },
    ],
    enabled: true,
  })

  const renderTypedTagline = () => {
    const fullFirstLine = 'Upskill. Reskill.'
    const fullSecondLine = "Get ready for what's next."
    const pinkStart = fullFirstLine.length

    const firstLineTypedLength = Math.min(typedTagline.length, fullFirstLine.length)
    const secondLineTypedLength = typedTagline.length > pinkStart ? typedTagline.length - pinkStart : 0

    return (
      <>
        <span style={{ display: 'block', color: 'white' }}>
          {fullFirstLine.substring(0, firstLineTypedLength)}
          {firstLineTypedLength < fullFirstLine.length && (
            <span style={{ visibility: 'hidden' }}>{fullFirstLine.substring(firstLineTypedLength)}</span>
          )}
        </span>
        <span style={{ display: 'block', color: '#EF0B72' }}>
          {fullSecondLine.substring(0, secondLineTypedLength)}
          {secondLineTypedLength < fullSecondLine.length && (
            <span style={{ visibility: 'hidden' }}>{fullSecondLine.substring(secondLineTypedLength)}</span>
          )}
        </span>
      </>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Check enrollment to redirect enrolled users to /progress
        if (signInData.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('enrolled_course')
            .eq('id', signInData.user.id)
            .maybeSingle()

          if (userData?.enrolled_course) {
            window.location.href = '/progress'
            return
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName } },
        })
        if (error) throw error

        if (data.user) {
          await createUserRecord(supabase, data.user, firstName, lastName)
          addToResendAudience(email, firstName, lastName)
        }
      }
      router.push('/courses')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setLoading(false)
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

  const handleOAuthSignIn = async (provider: 'google' | 'linkedin_oidc') => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/courses`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred with OAuth sign in'
      setError(message)
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      })
      if (error) throw error
      setResetSuccess(true)
      setLoading(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred sending reset email'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 overflow-y-auto"
        style={{ zIndex: 50, backgroundColor: '#000' }}
      >
        {/* Auth Form Section */}
        <div
          className="min-h-screen flex items-center justify-center px-8 relative"
          style={{
            backgroundImage: !isMobile
              ? 'url(https://auth.ignite.education/storage/v1/object/public/assets/Ignite%20-%20Desktop%20Background%20%283%29.png)'
              : 'url(https://auth.ignite.education/storage/v1/object/public/assets/Untitled%20design%20%281%29.png)',
            backgroundSize: isMobile ? '100% 100%' : 'auto 97%',
            backgroundPosition: isMobile ? 'center center' : 'left center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#000',
          }}
        >
          <div className="relative w-full flex flex-col items-center" style={{ maxWidth: '533px' }}>
            {/* Logo */}
            <img
              src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
              alt="Ignite Education"
              className="object-contain"
              style={{ width: '120px', height: '40px', marginBottom: '0.5rem' }}
            />

            {/* Tagline */}
            <div style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', marginBottom: 'clamp(0.75rem, 2vh, 1.25rem)' }}>
              <h1
                className="text-xl font-semibold text-white px-2"
                style={{ lineHeight: '1.2', fontSize: 'clamp(18.9px, 4.2vw, 27.3px)', textAlign: 'center' }}
              >
                {renderTypedTagline()}
              </h1>
            </div>

            <div className="w-full">
              {/* Form Card */}
              <div className="bg-white text-black px-5 pt-4 pb-3 rounded-md">
                {error && !showResetPassword && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                {/* OAuth Buttons */}
                <div className="space-y-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-md px-3 py-2 text-[1rem] tracking-[-0.02em] hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(103,103,103,0.25)]"
                  >
                    <span className="truncate">Continue with Google</span>
                    <img
                      src="https://auth.ignite.education/storage/v1/object/public/assets/Screenshot%202026-01-10%20at%2013.00.44.png"
                      alt="Google"
                      className="w-5 h-5 flex-shrink-0 object-contain"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('linkedin_oidc')}
                    disabled={loading}
                    className="w-full flex items-center justify-center bg-[#0a66c2] text-white rounded-md px-3 py-2 text-[1rem] tracking-[-0.02em] hover:bg-[#084d93] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(103,103,103,0.25)]"
                  >
                    Continue with LinkedIn
                  </button>
                </div>

                {/* Divider */}
                <div className="relative" style={{ marginBottom: '0.625rem' }}>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                  {/* Name fields - only visible in signup mode */}
                  <div
                    className={`grid grid-cols-2 gap-2 transition-all duration-200 ${
                      isLogin ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    <div>
                      <label className="block text-sm font-medium mb-0.5">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={!isLogin}
                        className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-md"
                        placeholder="Alan"
                        disabled={isLogin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-0.5">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={!isLogin}
                        className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-md"
                        placeholder="Turing"
                        disabled={isLogin}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-0.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-md"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-0.5">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-md"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#EF0B72] text-white rounded-lg px-4 py-2 text-[0.9rem] tracking-[-0.02em] font-semibold hover:bg-[#D50A65] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLogin ? 'Sign In' : 'Sign Up'}
                  </button>
                </form>

                {/* Account Toggle */}
                <div className="text-center" style={{ marginTop: '0.5625rem' }}>
                  {isLogin ? (
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          setIsLogin(false)
                          setError('')
                        }}
                        className="text-black hover:text-[#EF0B72] transition"
                        style={{ fontSize: '0.85em' }}
                      >
                        Don&apos;t have an account?
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetPassword(true)
                          setResetEmail(email)
                          setResetSuccess(false)
                          setError('')
                        }}
                        className="text-black hover:text-[#EF0B72] transition"
                        style={{ fontSize: '0.85em' }}
                      >
                        Reset password
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsLogin(true)
                        setError('')
                      }}
                      className="text-black hover:text-[#EF0B72] transition"
                      style={{ fontSize: '0.85em' }}
                    >
                      Already have an account?
                    </button>
                  )}
                </div>
              </div>

              {/* Terms and Privacy */}
              <p className="text-xs text-white text-center mt-3">
                By signing in, you agree to Ignite&apos;s<br />
                <a href="/terms" className="underline hover:text-[#EF0B72]">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="underline hover:text-[#EF0B72]">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Password Reset Modal */}
      {showResetPassword && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))' }}
          onClick={() => {
            setShowResetPassword(false)
            setResetSuccess(false)
            setError('')
          }}
        >
          <div className="relative">
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
              Reset Password
            </h2>

            <div
              className="bg-white relative"
              style={{ width: '450px', maxWidth: '90vw', padding: '2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowResetPassword(false)
                  setResetSuccess(false)
                  setError('')
                }}
                className="absolute top-4 right-4 text-gray-600 hover:text-black"
              >
                <X size={24} />
              </button>

              {!resetSuccess ? (
                <>
                  <p className="text-gray-700 mb-4 text-sm">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1 text-black">Email</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                        placeholder="you@example.com"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#EF0B72] text-white rounded-lg px-4 py-2 text-[0.9rem] tracking-[-0.02em] font-semibold hover:bg-[#D50A65] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">Check Your Email</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    We&apos;ve sent a password reset link to <strong>{resetEmail}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
