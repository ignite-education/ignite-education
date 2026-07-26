import { ImageResponse } from 'next/og'
import { getCourseBySlug } from '@/lib/courseData'
import { getCourseTypeLabel } from '@/lib/courseUtils'

export const revalidate = 3600

export const alt = 'Ignite Education course'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Per-course social card.
 *
 * Most courses have no `image_url`/`og_image` in the DB, so every one of them
 * shared the same generic site card. This gives each course a distinct preview
 * naming the course and its module count — which is what LinkedIn, Slack and
 * AI assistants surface when the URL is shared.
 *
 * Reachable at /courses/{slug}/opengraph-image via the matching rewrite in the
 * root vercel.json (same mechanism as /[username]/opengraph-image).
 */
export default async function OGImage({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params
  const course = await getCourseBySlug(courseSlug)

  const title = course?.title ?? 'Ignite Education'
  const kind = course ? getCourseTypeLabel(course) : 'Course'
  const moduleCount = course?.module_structure?.length ?? 0
  const lessonCount =
    course?.module_structure?.reduce((n, m) => n + (m.lessons?.length ?? 0), 0) ?? 0

  const facts = [
    moduleCount ? `${moduleCount} module${moduleCount === 1 ? '' : 's'}` : null,
    lessonCount ? `${lessonCount} lesson${lessonCount === 1 ? '' : 's'}` : null,
    'Free',
    'Certificate',
  ].filter(Boolean) as string[]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px 80px',
          backgroundColor: '#000000',
          backgroundImage:
            'radial-gradient(circle at 22% 62%, rgba(239,11,114,0.34) 0%, rgba(0,0,0,0) 46%), radial-gradient(circle at 82% 24%, rgba(119,20,224,0.30) 0%, rgba(0,0,0,0) 48%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 40, height: 40 }}>
            <div style={{ display: 'flex', width: 40, height: 40, backgroundColor: '#EF0B72' }} />
            <div
              style={{
                display: 'flex',
                width: 26,
                height: 26,
                backgroundColor: '#7714E0',
                marginLeft: -26,
                marginTop: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#ffffff', fontWeight: 700 }}>
            ignite
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.45)' }}>
            {kind}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 26 ? 76 : 96,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 26,
              fontSize: 30,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            Free, expert-built course from Ignite Education
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {facts.map((fact) => (
            <div
              key={fact}
              style={{
                display: 'flex',
                fontSize: 24,
                color: '#ffffff',
                padding: '10px 22px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.28)',
              }}
            >
              {fact}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
