'use client'

import Link from 'next/link'
import { useEffect, useState, type RefObject } from 'react'
import Lottie from 'lottie-react'
import { createClient, clearSupabaseCookies } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import lottieData from '../../public/icon-animation.json'

const LOGO_BLACK = 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_5.png'
const LOGO_WHITE = 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png'

// Themed mode (see the `theme` prop): the whole bar swaps between a light and a
// dark look to match the section beneath it, easing over 300ms, on a blurred
// translucent tint. Modelled on harvey.ai's header.
const THEME_EASE = '300ms cubic-bezier(0.3, 0.3, 0.3, 1)'
const THEME_TINT = {
  white: 'rgba(255, 255, 255, 0.72)',
  black: 'rgba(0, 0, 0, 0.6)',
} as const
const THEME_BLUR = 'blur(16px)'

interface NavbarProps {
  logoClipPercentage?: number
  invertLayers?: boolean
  logoContainerRef?: RefObject<HTMLDivElement | null>
  variant?: 'default' | 'black' | 'frosted'
  /** The colour of the section currently beneath the bar. When set, the bar
   *  takes a matching translucent tint and the logo crossfades to contrast
   *  with it, instead of the clip-path split driven by `logoClipPercentage`. */
  theme?: 'white' | 'black'
  hideLogo?: boolean
  noPaddingBottom?: boolean
}

export default function Navbar({ logoClipPercentage = 100, invertLayers = false, logoContainerRef, variant = 'default', theme, hideLogo = false, noPaddingBottom = false }: NavbarProps) {
  // For frosted variant, always show black logo (invert layers to put black on top)
  // For frosted variant, always show black logo (invert layers to put black on top)
  const effectiveInvertLayers = variant === 'frosted' ? true : invertLayers
  const effectiveClipPercentage = variant === 'frosted' ? 100 : logoClipPercentage
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
    }).catch(() => {
      // Corrupted session cookie (e.g. Invalid UTF-8 sequence) — clear and show Sign In
      clearSupabaseCookies()
      setAuthLoaded(true)
    })

    // Catch unhandled Supabase internal errors (e.g. Invalid UTF-8 from corrupted cookies)
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes('Invalid UTF-8')) {
        e.preventDefault()
        clearSupabaseCookies()
        setAuthLoaded(true)
        setUser(null)
      }
    }
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const avatarUrl = session.user.user_metadata?.custom_avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        setProfilePicture(avatarUrl)
        setFirstName(session.user.user_metadata?.first_name || session.user.user_metadata?.name?.split(' ')[0])
      } else {
        setProfilePicture(null)
        setFirstName(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <div
      className={theme ? '' : variant === 'black' ? 'bg-black' : variant === 'frosted' ? 'bg-[#E5E5E7]/70 backdrop-blur-md' : ''}
      style={theme ? {
        backgroundColor: THEME_TINT[theme],
        backdropFilter: THEME_BLUR,
        WebkitBackdropFilter: THEME_BLUR,
        transition: `background-color ${THEME_EASE}`,
      } : undefined}
    >
      {/* 15px padding either side of a 35px row: the navbar is 65px tall at every breakpoint. */}
      <div className={`px-6 md:px-10 pt-[15px] ${noPaddingBottom ? 'pb-0' : 'pb-[15px]'} flex items-center justify-between`}>
        {/* Logo - links to home (hidden on pages with centered logo).
            Targets /welcome, not "/": the apex root permanently redirects there,
            and every public page carries this Navbar, so pointing it at "/" had
            the whole site nominating a redirecting URL as the homepage — which
            fought the 308 and kept Google indexing "/".
            The alt is "Ignite Education home" rather than the bare brand name
            because an image's alt is the anchor text of the link wrapping it, and
            Google was echoing that exact string back as the SERP title. */}
        {hideLogo ? (
          <div className="w-[35px] md:w-[99px]" />
        ) : (
          // Fixed at 35px to match the sign-in area; the 99px-wide text logo is ~36px tall and overflows by half a pixel.
          <Link href="/welcome" className="flex items-center h-[35px]">
            {/* Mobile: animated square icon — Lottie canvas is 600x600 with ~15% internal padding, so we overflow-clip it */}
            <div className="md:hidden w-[33px] h-[33px] overflow-hidden">
              <Lottie
                animationData={lottieData}
                loop
                autoplay
                style={{ width: '47.5px', height: '47.5px', marginTop: '-7.5px', marginLeft: '-6.5px' }}
              />
            </div>
            {/* Desktop: text logo with clip-path transitions */}
            <div ref={logoContainerRef} className="logo-container hidden md:block" style={{ position: 'relative', width: '99px', height: 'auto' }}>
              {theme ? (
                <>
                  {/* Themed: both logos stacked, crossfading so the bar's
                      colour swap reads as one eased change. */}
                  <img
                    src={LOGO_BLACK}
                    alt="Ignite Education home"
                    className="logo-layer"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '99px',
                      height: 'auto',
                      opacity: theme === 'white' ? 1 : 0,
                      transition: `opacity ${THEME_EASE}`,
                    }}
                  />
                  <img
                    src={LOGO_WHITE}
                    alt=""
                    aria-hidden="true"
                    className="logo-layer"
                    style={{
                      position: 'relative',
                      width: '99px',
                      height: 'auto',
                      opacity: theme === 'black' ? 1 : 0,
                      transition: `opacity ${THEME_EASE}`,
                    }}
                  />
                </>
              ) : !effectiveInvertLayers ? (
                <>
                  {/* Standard order for BLACK->WHITE transitions */}
                  {/* Black logo - clips from top, shows bottom portion */}
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_5.png"
                    alt="Ignite Education home"
                    className="logo-layer"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '99px',
                      height: 'auto',
                      clipPath: `inset(${effectiveClipPercentage}% 0 0 0)`
                    }}
                  />
                  {/* White logo - clips from bottom, shows top portion */}
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png"
                    alt=""
                    aria-hidden="true"
                    className="logo-layer"
                    style={{
                      position: 'relative',
                      width: '99px',
                      height: 'auto',
                      clipPath: `inset(0 0 ${100 - effectiveClipPercentage}% 0)`
                    }}
                  />
                </>
              ) : (
                <>
                  {/* Inverted order for WHITE->BLACK transitions */}
                  {/* White logo - clips from top, shows bottom portion */}
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png"
                    alt="Ignite Education home"
                    className="logo-layer"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '99px',
                      height: 'auto',
                      clipPath: `inset(${effectiveClipPercentage}% 0 0 0)`
                    }}
                  />
                  {/* Black logo - clips from bottom, shows top portion */}
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_5.png"
                    alt=""
                    aria-hidden="true"
                    className="logo-layer"
                    style={{
                      position: 'relative',
                      width: '99px',
                      height: 'auto',
                      clipPath: `inset(0 0 ${100 - effectiveClipPercentage}% 0)`
                    }}
                  />
                </>
              )}
            </div>
          </Link>
        )}

        {/* Right side - Sign In button by default, swaps to avatar once auth confirms signed in */}
        <div
          className="flex items-center justify-end w-[85px] h-[35px] transition-opacity duration-300 ease-out"
          style={{ opacity: authLoaded ? 1 : 0 }}
        >
          {authLoaded && (user ? (
            <Link href="/progress" className="inline-block">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="object-cover rounded-sm w-[35px] h-[35px]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="bg-[#8200EA] flex items-center justify-center text-white font-medium rounded-sm w-[35px] h-[35px]"
                >
                  {firstName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="px-5 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap h-[35px]"
              style={{ letterSpacing: '-0.01em', borderRadius: '0.25rem', width: '85px', textAlign: 'center' }}
            >
              Sign In
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
