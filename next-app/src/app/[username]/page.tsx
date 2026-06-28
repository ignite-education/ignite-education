import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/lib/profileData'
import { getCoursesByType } from '@/lib/courseData'
import {
  generatePersonStructuredData,
  generateProfileBreadcrumbStructuredData,
} from '@/lib/structuredData'
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

      <main>
        <ProfileHero profile={profile} />

        {/* Black section — placeholder for future profile content */}
        <section
          className="bg-black"
          style={{ height: '70vh', minHeight: '500px', maxHeight: '550px' }}
        />

        <CourseCatalogClient coursesByType={coursesByType} hideLogo />
      </main>

      <Footer />
    </>
  )
}
