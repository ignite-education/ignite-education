import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCertificateById } from '@/lib/certificateData'
import {
  generateCertificateStructuredData,
  generateCertificateBreadcrumbStructuredData,
} from '@/lib/structuredData'
import CertificateClient from './CertificateClient'

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
    openGraph: {
      title,
      description,
      url,
      siteName: 'Ignite Education',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
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
