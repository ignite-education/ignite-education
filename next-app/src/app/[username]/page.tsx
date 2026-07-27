import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/lib/profileData'
import { getCoursesByType } from '@/lib/courseData'
import {
  generatePersonStructuredData,
  generateProfileBreadcrumbStructuredData,
} from '@/lib/structuredData'
import Navbar from '@/components/Navbar'
import ProfileHero from './ProfileHero'
import CourseCatalogClient from '../courses/CourseCatalogClient'
import Footer from '@/components/Footer'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ username: string }>
}

function joinMonth(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return { title: 'Profile Not Found' }
  }

  const month = joinMonth(profile.joined_at)
  const lessonsBit =
    profile.lessons_completed > 0
      ? ` and has completed ${profile.lessons_completed} ${profile.lessons_completed === 1 ? 'lesson' : 'lessons'}`
      : ''
  const description = `${profile.display_name} joined Ignite Education${month ? ` in ${month}` : ''}${lessonsBit}. Explore free, expert-led courses in Product Management, Cyber Security, Data Analysis, and UX Design.`
  const url = `https://ignite.education/${profile.username}`

  return {
    title: profile.display_name,
    description,
    // Indexable. Note the standing caveat: a profile is currently a display
    // name, two stat chips and a copy of the course catalog, so these are thin
    // and near-duplicate at the root of the domain, growing one per signup —
    // the risk is dilution rather than lift until profiles carry unique
    // content (completed courses, certificates, a bio). Revisit if Search
    // Console starts reporting them as "Crawled - currently not indexed".
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title: `${profile.display_name} — Ignite Education`,
      description,
      url,
      siteName: 'Ignite Education',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.display_name} — Ignite Education`,
      description,
    },
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    notFound()
  }

  // Course search/catalog section — same "What do you want to learn?" browser as /courses
  const coursesByType = await getCoursesByType()

  const structuredData = [
    generatePersonStructuredData(profile),
    generateProfileBreadcrumbStructuredData(profile.display_name, profile.username),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Sticky black nav, same treatment as the course detail pages. It sits
          on the hero's own black, so there is no seam to hide while scrolling. */}
      <div className="sticky top-0 z-50">
        <Navbar variant="black" />
      </div>

      <main>
        <ProfileHero profile={profile} />

        <CourseCatalogClient coursesByType={coursesByType} hideLogo openInNewTab collapsible />
      </main>

      <Footer />
    </>
  )
}
