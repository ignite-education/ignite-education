'use client'

import Link from 'next/link'
import { useEffect, useState, type RefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface NavbarProps {
  logoClipPercentage?: number
  invertLayers?: boolean
  logoContainerRef?: RefObject<HTMLDivElement | null>
  variant?: 'default' | 'black'
}

export default function Navbar({ logoClipPercentage = 100, invertLayers = false, logoContainerRef, variant = 'default' }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        const avatarUrl = user.user_metadata?.custom_avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
        setProfilePicture(avatarUrl)
        setFirstName(user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0])
      }
      setAuthLoaded(true)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        setProfilePicture(avatarUrl)
        setFirstName(session.user.user_metadata?.first_name || session.user.user_metadata?.name?.split(' ')[0])
      } else {
        setProfilePicture(null)
        setFirstName(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className={variant === 'black' ? 'bg-black' : ''}>
      <div className="px-10 py-[15px] flex items-center justify-between">
        {/* Logo - links to home */}
        <Link href="/" className="inline-block">
          <div ref={logoContainerRef} className="logo-container" style={{ position: 'relative', width: '99px', height: 'auto' }}>
            {!invertLayers ? (
              <>
                {/* Standard order for BLACK->WHITE transitions */}
                {/* Black logo - clips from top, shows bottom portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_5.png"
                  alt="Ignite Education"
                  className="logo-layer"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(${logoClipPercentage}% 0 0 0)`
                  }}
                />
                {/* White logo - clips from bottom, shows top portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png"
                  alt=""
                  aria-hidden="true"
                  className="logo-layer"
                  style={{
                    position: 'relative',
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(0 0 ${100 - logoClipPercentage}% 0)`
                  }}
                />
              </>
            ) : (
              <>
                {/* Inverted order for WHITE->BLACK transitions */}
                {/* White logo - clips from top, shows bottom portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png"
                  alt="Ignite Education"
                  className="logo-layer"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(${logoClipPercentage}% 0 0 0)`
                  }}
                />
                {/* Black logo - clips from bottom, shows top portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_5.png"
                  alt=""
                  aria-hidden="true"
                  className="logo-layer"
                  style={{
                    position: 'relative',
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(0 0 ${100 - logoClipPercentage}% 0)`
                  }}
                />
              </>
            )}
          </div>
        </Link>

        {/* Right side - Sign In button or Profile (invisible placeholder until auth loads) */}
        <div style={{ width: '85px', height: '41px' }} className="flex items-center justify-end">
          {authLoaded && (
            user ? (
              <Link href="/progress" className="inline-block">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="object-cover rounded-sm"
                    style={{ width: '41px', height: '41px' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="bg-[#8200EA] flex items-center justify-center text-white font-medium rounded-sm"
                    style={{ width: '41px', height: '41px' }}
                  >
                    {firstName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="px-5 py-2 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors"
                style={{ letterSpacing: '-0.01em', borderRadius: '0.25rem', width: '85px', display: 'inline-block', textAlign: 'center' }}
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  )
}
