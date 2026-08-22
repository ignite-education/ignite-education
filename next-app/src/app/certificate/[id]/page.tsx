import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCertificateById } from '@/lib/certificateData'
import {
  generateCertificateStructuredData,
  generateCertificateBreadcrumbStructuredData,
} from '@/lib/structuredData'
import CertificateClient from './CertificateClient'
import { OG_DEFAULTS, brandTitle } from '@/lib/siteConfig'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const certificate = await getCertificateById(id)

  if (!certificate) {
    return { title: 'Certificate Not Found' }
  }

  const title = `${certificate.user_name} — ${certificate.course_name} Certificate`
  const description = `${certificate.user_name} has successfully completed the ${certificate.course_name} course at Ignite Education. Verify this certificate and explore our courses in Product Management, Cyber Security, Data Analysis, and UX Design.`
  const url = `https://ignite.education/certificate/${id}`

  return {
    title,
    description,
    // Per-user artifacts with unbounded cardinality and near-identical copy.
    // noindex does not affect LinkedIn/X unfurling, so sharing — the actual
    // purpose of these pages — still works via opengraph-image.tsx.
    robots: { index: false, follow: true },
    alternates: { canonical: `/certificate/${id}` },
    openGraph: {
      // Spread, never replace: Next overwrites openGraph across layout → page
      // rather than merging it, so omitting this drops siteName and locale.
      // Deliberately NO `images` — leaving it unset lets the file-convention
      // opengraph-image.tsx supply the per-certificate card, which is the whole
      // reason these noindexed pages exist.
      ...OG_DEFAULTS,
      title: brandTitle(title),
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandTitle(title),
      description,
    },
  }
}

export default async function CertificatePage({ params }: PageProps) {
  const { id } = await params
  const certificate = await getCertificateById(id)

  if (!certificate) {
    notFound()
  }

  const structuredData = [
    generateCertificateStructuredData(certificate),
    generateCertificateBreadcrumbStructuredData(certificate.user_name, certificate.id),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <CertificateClient certificate={certificate} />
      </div>
    </>
  )
}
