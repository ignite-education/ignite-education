import Link from 'next/link'
import type { PublicProfile } from '@/lib/profileData'
import ProfileLogo from './ProfileLogo'
import ShareButton from './ShareButton'

// Match the progress page tag format exactly: "Oct-25" (IntroSection.jsx formatJoinDate)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatJoinDate(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return `${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`
}

/**
 * Public-fields-only port of the white "intro" hero from the private progress
 * page (src/components/ProgressHubV2/sections/IntroSection.jsx). Server-rendered
 * (no hooks) so the name H1 + tags land in the static HTML for SEO. Shows ONLY
 * public-safe data: name, avatar, join date, lessons-completed count.
 */
export default function ProfileHero({ profile }: { profile: PublicProfile }) {
  const joined = formatJoinDate(profile.joined_at)
  const lessons = profile.lessons_completed
  const lessonLabel = lessons === 1 ? '1 Lesson' : `${lessons} Lessons`
  const initial = (profile.display_name || 'U').trim().charAt(0).toUpperCase() || 'U'

  return (
    <section
      className="bg-white"
      style={{
        position: 'relative',
        height: '70vh',
        minHeight: '500px',
        maxHeight: '550px',
        padding: '30px 40px 0 40px',
        fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div className="flex w-full gap-16 items-start">
        {/* Left Column: Logo, Avatar, Name, Tags */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
          {/* Ignite Logo — animated flame, 61x61, matching the progress page hero */}
          <Link
            href="/welcome"
            style={{ marginBottom: '55px', display: 'block', width: 'fit-content', marginLeft: '-9px' }}
          >
            <ProfileLogo />
          </Link>

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

          {/* Name */}
          <h1
            className="font-bold text-black"
            style={{ fontSize: '2.4rem', lineHeight: '1.2', letterSpacing: '-0.01em' }}
          >
            {profile.display_name}
          </h1>

          {/* Tags Row */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            {joined && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-[#F0F0F0] rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em' }}
              >
                Joined {joined}
              </span>
            )}
            {lessons >= 1 && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-[#F0F0F0] rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em' }}
              >
                {lessonLabel}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: empty for now — keeps the left column at the same half-width
            geometry as the progress page hero (placeholder for future profile content) */}
        <div aria-hidden="true" style={{ flex: 1, minWidth: 0 }} />
      </div>

      {/* Share button — bottom-left, matching the progress page hero */}
      <div className="flex items-center gap-2" style={{ position: 'absolute', bottom: '30px', left: '40px' }}>
        <ShareButton
          url={`https://ignite.education/${profile.username}`}
          title={`${profile.display_name} | Ignite Education`}
        />
      </div>
    </section>
  )
}
