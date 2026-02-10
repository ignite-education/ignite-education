import { ImageResponse } from 'next/og'
import { getCertificateById } from '@/lib/certificateData'

export const revalidate = 3600

export const alt = 'Ignite Education Certificate'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const certificate = await getCertificateById(id)

  if (!certificate) {
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
          Certificate Not Found
        </div>
      ),
      { ...size }
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

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
          <div
            style={{
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 600 }}>
              {certificate.course_name}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>
              Certification
            </div>
          </div>
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
          <div style={{ fontSize: 16, color: '#1f2937', marginBottom: 8 }}>
            Ignite certifies that
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: '#EF0B72',
              marginBottom: 12,
            }}
          >
            {certificate.user_name}
          </div>
          <div
            style={{
              fontSize: 16,
              color: '#1f2937',
              lineHeight: 1.4,
              marginBottom: 40,
              maxWidth: 500,
            }}
          >
            Has successfully passed the {certificate.course_name} course at Ignite,
            and has demonstrated all of the necessary knowledge, skills and
            full course requirements.
          </div>
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>Awarded by</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Max Shillam, Founder of Ignite
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: 20,
              display: 'flex',
              gap: 32,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#4b5563' }}>Certification Number:</div>
              <div style={{ fontFamily: 'monospace' }}>{certificate.certificate_number}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#4b5563' }}>Date of Issue:</div>
              <div>{formatDate(certificate.issued_date)}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
