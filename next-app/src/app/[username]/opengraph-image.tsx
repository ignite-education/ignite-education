import { ImageResponse } from 'next/og'
import { getProfileByUsername } from '@/lib/profileData'

export const revalidate = 3600

export const alt = 'Ignite Education Profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 32,
          }}
        >
          Profile Not Found
        </div>
      ),
      { ...size }
    )
  }

  const joined = (() => {
    const date = new Date(profile.joined_at)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  })()

  const lessonsLabel =
    profile.lessons_completed === 1 ? '1 lesson completed' : `${profile.lessons_completed} lessons completed`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#f3f4f6',
        }}
      >
        {/* Left Panel - Black */}
        <div
          style={{
            width: '420px',
            height: '100%',
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '48px',
            color: '#ffffff',
          }}
        >
          {/* Logo text fallback (can't use external images reliably in OG) */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              color: '#ffffff',
            }}
          >
            IGNITE
          </div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>Learner Profile</div>
        </div>

        {/* Right Panel - White */}
        <div
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '48px 56px',
            color: '#000000',
          }}
        >
          <div style={{ fontSize: 16, color: '#1f2937', marginBottom: 8 }}>Learning at Ignite</div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 600,
              color: '#EF0B72',
              marginBottom: 24,
            }}
          >
            {profile.display_name}
          </div>
          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: 20,
              display: 'flex',
              gap: 32,
              fontSize: 15,
            }}
          >
            {joined && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#4b5563' }}>Joined</div>
                <div style={{ fontWeight: 600 }}>{joined}</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#4b5563' }}>Progress</div>
              <div style={{ fontWeight: 600 }}>{lessonsLabel}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
