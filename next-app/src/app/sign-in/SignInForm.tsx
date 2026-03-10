'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useTypingAnimation from '@/hooks/useTypingAnimation'
import Footer from '@/components/Footer'

export default function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    </>
  )
}
