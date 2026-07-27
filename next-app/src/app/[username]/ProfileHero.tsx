'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PublicProfile } from '@/lib/profileData'
import ProfileAuthCTA from './ProfileAuthCTA'

// Match the progress page tag format exactly: "Oct-25" (IntroSection.jsx formatJoinDate)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatJoinDate(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return `${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`
}

/**
 * The course hero's content band, replicated so the profile's left/right edges
 * line up with the course pages. It is not a fixed padding — it is a centred
 * band that measures 954px at lg+, 762px at md, and falls back to 24px gutters
 * below that. Classes mirror CourseHero.tsx (`max-w-4xl mx-auto px-6` >
 * `max-w-[762px]` > `lg:-mx-24`); change them together.
 */
function HeroBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-6 flex justify-center">
      <div className="w-full" style={{ maxWidth: '762px' }}>
        <div className="lg:-mx-24">{children}</div>
      </div>
    </div>
  )
}

/** "Max Shillam" -> "Max S". Single-word names are returned unchanged. */
function shortName(displayName: string): string {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}`
}

/**
 * Public-fields-only port of the "intro" hero from the private progress page
 * (src/components/ProgressHubV2/sections/IntroSection.jsx), recoloured to the
 * black band used by the course detail pages. Shows ONLY public-safe data:
 * name, avatar, join date, lessons-completed count.
 *
 * No logo here — the sticky <Navbar variant="black" /> in page.tsx owns it, the
 * same way CourseHero leaves it to the navbar.
 *
 * A client component so one auth subscription drives both the heading and the
 * sign-up buttons. Next still server-renders it, so the H1 and tags are in the
 * static HTML — but the SSR pass necessarily runs with the signed-out state
 * (the page is ISR; there are no request cookies), so the *indexed* H1 is the
 * "Join X on Ignite" variant, not the profile name. The name remains in the
 * <title>, meta description and Person JSON-LD.
 */
export default function ProfileHero({ profile }: { profile: PublicProfile }) {
  const joined = formatJoinDate(profile.joined_at)
  const lessons = profile.lessons_completed
  const lessonLabel = lessons === 1 ? '1 Lesson' : `${lessons} Lessons`
  const initial = (profile.display_name || 'U').trim().charAt(0).toUpperCase() || 'U'

  // `null` = signed out, which is also the SSR/first-paint state. Signed-out is
  // both the crawler's view and the common case, so it renders with no delay;
  // the buttons are the only thing gated on authLoaded (see below).
  const [signedIn, setSignedIn] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setSignedIn(!!user)
        setAuthLoaded(true)
      })
      .catch(() => setAuthLoaded(true))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user)
      setAuthLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const heading = signedIn
    ? profile.display_name
    : `Join ${shortName(profile.display_name)} on Ignite`

  return (
    <section
      className="bg-black"
      style={{
        position: 'relative',
        // ~30% shorter than the original 70vh / 500 / 550 band (-30%, +5%, -5%).
        // Nothing is pinned to the section's bottom any more — the share row
        // moved into the sign-up CTA — so all three values scale together.
        height: '48.9vh',
        minHeight: '366px',
        maxHeight: '384px',
        // Left/right padding is owned by HeroBand, not the section.
        // 40px top: the navbar above supplies the rest of the breathing room
        // that the removed in-hero logo used to (61px glyph + 55px margin).
        padding: '40px 0 0 0',
        fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <HeroBand>
      <div className="flex w-full gap-16 items-start">
        {/* Left Column: Avatar, Name, Tags */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
          {/* Profile Picture — plain <img> (Google/LinkedIn hosts aren't in next.config remotePatterns) */}
          <div style={{ marginBottom: '30px', position: 'relative', width: '150px', height: '150px' }}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url.replace(/=s\d+-c/, '=s200-c')}
                alt={profile.display_name}
                referrerPolicy="no-referrer"
                className="object-cover"
                style={{ width: '150px', height: '150px', borderRadius: '0.1rem' }}
              />
            ) : (
              <div
                className="bg-[#7714E0] flex items-center justify-center text-white font-bold"
                style={{ width: '150px', height: '150px', fontSize: '36px', borderRadius: '0.1rem' }}
              >
                {initial}
              </div>
            )}
          </div>

          {/* Name — becomes a join prompt for signed-out visitors.
              Type matches the course-page title (CourseHero.tsx): semibold,
              2rem / 40px at md, -0.02em. */}
          <h1
            className="text-[2rem] md:text-[40px] font-semibold text-white"
            style={{ lineHeight: '1.2', letterSpacing: '-0.02em' }}
          >
            {heading}
          </h1>

          {/* Tags Row */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            {joined && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-white rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em' }}
              >
                Joined {joined}
              </span>
            )}
            {lessons >= 1 && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-white rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em' }}
              >
                {lessonLabel}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: sign-up buttons for signed-out visitors. Kept mounted
            either way so the left column holds its half-width geometry.
            Unlike the H1, these fade in only once auth has resolved — a flash
            of sign-up buttons at a already-signed-in user is worse than the
            ~200ms wait, and they carry no SEO value to lose. */}
        <div
          className="hidden md:flex items-center justify-center"
          style={{
            flex: 1,
            minWidth: 0,
            // Stretch only this column (the row is items-start for the left
            // column's sake) so items-center has a full-height box to centre in.
            alignSelf: 'stretch',
            opacity: authLoaded && !signedIn ? 1 : 0,
            transition: 'opacity 0.35s ease',
            pointerEvents: authLoaded && !signedIn ? 'auto' : 'none',
          }}
          aria-hidden={signedIn || !authLoaded}
        >
          {!signedIn && (
            <ProfileAuthCTA
              onSignedIn={() => setSignedIn(true)}
              profileUrl={`https://ignite.education/${profile.username}`}
              displayName={profile.display_name}
            />
          )}
        </div>
      </div>
      </HeroBand>
    </section>
  )
}
