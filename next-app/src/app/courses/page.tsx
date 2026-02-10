import { Metadata } from 'next'
import { getCoursesByType } from '@/lib/courseData'
import { generateItemListStructuredData, generateSpeakableSchema } from '@/lib/structuredData'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CourseCatalogClient from './CourseCatalogClient'

export const revalidate = 3600

const BASE_URL = 'https://ignite.education'

export const metadata: Metadata = {
  title: 'Courses',
  description:
    'Explore free courses in Product Management, Cybersecurity, Data Analysis, and more. Find your specialism, skill, or subject and start learning today with Ignite Education.',
  keywords:
    'free online courses, product management course, cybersecurity course, data analysis course, career courses uk, free courses with certificate, ignite education, online learning',
  openGraph: {
    title: 'Courses | Ignite Education',
    description:
      'Explore free, expert-led courses in Product Management, Cybersecurity, Data Analysis, and more.',
    url: `${BASE_URL}/courses`,
    siteName: 'Ignite Education',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Courses | Ignite Education',
    description:
      'Explore free, expert-led courses in Product Management, Cybersecurity, Data Analysis, and more.',
  },
}

export default async function CourseCatalogPage() {
  const coursesByType = await getCoursesByType()

  const structuredData = [
    generateItemListStructuredData(coursesByType),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'Courses', 'item': `${BASE_URL}/courses` },
      ],
    },
    generateSpeakableSchema(
      `${BASE_URL}/courses`,
      'Courses | Ignite Education',
      ['h1', 'h2', '.course-search-input']
    ),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-white">
        <Navbar variant="black" />
        <CourseCatalogClient coursesByType={coursesByType} />
        <Footer />
      </div>
    </>
  )
}
