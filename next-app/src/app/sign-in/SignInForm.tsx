'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import lottieData from '../../../public/icon-animation.json'
import Footer from '@/components/Footer'

export default function SignInForm() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)
  const [lottieReady, setLottieReady] = useState(false)

  useEffect(() => {
    if (lottieRef.current) {
      setTimeout(() => lottieRef.current?.play(), 300)
    }
  }, [lottieReady])

  // Show error from OAuth callback failure
  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

  const handleOAuthSignIn = async (provider: 'google' | 'linkedin_oidc') => {
    setError('')
    setLoading(true)

    try {
      const redirectParam = searchParams.get('redirect')
      const callbackParams = redirectParam === 'admin'
        ? '?next=/courses&redirect=admin'
        : '?next=/courses'

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${siteUrl}/auth/callback${callbackParams}`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred with OAuth sign in'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 overflow-y-auto flex flex-col"
        style={{ zIndex: 50, backgroundColor: '#fff' }}
      >
        {/* Auth Form Section */}
        <div
          className="flex-1 flex items-center justify-center px-8 relative"
          style={{
            backgroundColor: '#fff',
          }}
        >
          <div className="relative w-full flex flex-col items-center py-[5rem] lg:py-0" style={{ maxWidth: '533px' }}>
            {/* Logo Animation */}
            <div className="w-[75px] h-[75px] md:w-[88px] md:h-[88px] relative" style={{ marginBottom: '0.5rem' }}>
              {!lottieReady && (
                <svg
                  viewBox="0 0 600 600"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                >
                  <rect x="92.5" y="92.5" width="415" height="415" fill="#EF0B72" />
                  <rect x="92.5" y="231.5" width="277" height="277" fill="#B30FA9" />
                  <rect x="93" y="370" width="138" height="138" fill="#7714E0" />
                </svg>
              )}
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieData}
                loop={true}
                autoplay={false}
                onDOMLoaded={() => setLottieReady(true)}
                onLoopComplete={() => {
                  loopCountRef.current += 1
                  if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                    lottieRef.current.pause()
                    setTimeout(() => {
                      lottieRef.current?.goToAndPlay(0)
                    }, 4000)
                  }
                }}
                style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
              />
            </div>

            {/* Tagline */}
            <div className="mb-[0.875rem] md:mb-[1.75rem]" style={{ paddingTop: '0.25rem', paddingBottom: '0' }}>
              <h1
                className="text-xl font-semibold px-2"
                style={{ lineHeight: '1.2', fontSize: 'clamp(18.9px, 4.2vw, 27.3px)', textAlign: 'center', letterSpacing: '-0.02em' }}
              >
                <span style={{ display: 'block', color: '#000' }}>Upskill. Reskill.</span>
                <span style={{ display: 'block', color: '#EF0B72' }}>Get ready for what&apos;s next.</span>
              </h1>
            </div>

            <div className="w-full">
              {/* Form Card */}
              <div className="bg-white text-black px-5 pt-4 pb-4 rounded-md">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                {/* OAuth Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ height: '40px' }}
                  >
                    Continue with Google
                    <img
                      src="https://auth.ignite.education/storage/v1/object/public/assets/Google_Favicon_2025.png"
                      alt="Google"
                      style={{ width: '17.5px', height: '17.5px', marginTop: '-3px' }}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('linkedin_oidc')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-[0.65rem] text-[1rem] tracking-[-0.02em] transition-shadow duration-350 ease-in-out font-normal cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ height: '40px' }}
                  >
                    Continue with LinkedIn
                    <svg width="21" height="21" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-2px' }}>
                      <path fill="#0A66C2" d="M60.67 6H11.33A5.33 5.33 0 006 11.33v49.34A5.33 5.33 0 0011.33 66h49.34A5.33 5.33 0 0066 60.67V11.33A5.33 5.33 0 0060.67 6zM24.29 56H15.7V29.12h8.59V56zM20 25.46a4.97 4.97 0 110-9.94 4.97 4.97 0 010 9.94zM56 56h-8.59V42.93c0-3.12-.06-7.13-4.34-7.13-4.35 0-5.01 3.39-5.01 6.9V56h-8.59V29.12h8.24v3.67h.12a9.03 9.03 0 018.12-4.46c8.69 0 10.29 5.72 10.29 13.15V56z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Terms and Privacy */}
              <p className="text-xs text-black text-center mt-4">
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
    </>
  )
}
