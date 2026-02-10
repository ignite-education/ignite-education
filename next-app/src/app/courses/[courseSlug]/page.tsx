import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCourseBySlug, getCoachesByCourseSlug } from '@/lib/courseData'
import { generateCourseKeywords } from '@/lib/seoKeywords'
import {
  generateCourseStructuredData,
  generateFAQStructuredData,
  generateBreadcrumbStructuredData,
  generateSpeakableSchema,
} from '@/lib/structuredData'
import type { FAQ } from '@/types/course'
import CourseHero from './CourseHero'
import CourseCurriculum from './CourseCurriculum'
import FeedbackSection from './FeedbackSection'
import CourseLeaders from './CourseLeaders'
import FAQSection from './FAQSection'
import Footer from '@/components/Footer'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ courseSlug: string }>
}

const COURSE_FAQS: FAQ[] = [
  {
    question: 'What is Ignite?',
    answer: "Ignite gives you free, expert-led courses in high-demand careers like Product Management and Cybersecurity, so you can build the skills that actually get you hired in today's competitive job market.",
  },
  {
    question: 'Who is Ignite for?',
    answer: 'Ignite is for anyone ready to level up their career, especially students, recent graduates, and young professionals looking to break into competitive fields, switch careers, or gain new skills quickly.',
  },
  {
    question: 'How much does Ignite cost?',
    answer: 'Ignite courses are completely free, supported by limited advertising. Want an ad-free experience plus exclusive access to industry professionals and curated job opportunities? Upgrade for just 99p/week.',
  },
  {
    question: 'What can I learn on Ignite?',
    answer: 'We offer comprehensive courses in Product Management and Cyber Security, with more fields launching soon. Each course includes interactive lessons, knowledge checks and certification to boost your CV.',
  },
  {
    question: 'Can I learn at my own pace?',
    answer: 'Absolutely. Ignite courses are self-paced, so you can learn when and where it works best for you. We suggest completing 2 to 4 lessons per week for the best results and maximum knowledge retention.',
  },
  {
    question: 'What makes Ignite different?',
    answer: 'Unlike other platforms, Ignite is completely free with no paywalls or hidden costs. We focus on practical, industry-relevant skills that employers actually want, not just theory. Our courses get you job-ready, fast.',
  },
]

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('courses')
    .select('name')
    .in('status', ['live', 'coming_soon'])

  return data?.map((course: { name: string }) => ({
    courseSlug: course.name.toLowerCase().replace(/\s+/g, '-'),
  })) || []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseSlug } = await params
  const course = await getCourseBySlug(courseSlug)

  if (!course) {
    return { title: 'Course Not Found' }
  }

  const title = `Become a ${course.title}`
  const shortDesc = `Become a ${course.title} with Ignite's free, expert-built course`
  const description = course.description
    ? `${shortDesc} ${course.description}`.slice(0, 160)
    : shortDesc
  const url = `https://ignite.education/courses/${courseSlug}`
  const ogImage = course.og_image || course.image_url || 'https://ignite.education/og-image.png'

  return {
    title,
    description,
    keywords: generateCourseKeywords(course.title),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | Ignite Education`,
      description,
      url,
      siteName: 'Ignite Education',
      images: [{ url: ogImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ignite Education`,
      description,
      images: [ogImage],
    },
  }
}

export default async function CoursePage({ params }: PageProps) {
  const { courseSlug } = await params

  const [course, coaches] = await Promise.all([
    getCourseBySlug(courseSlug),
    getCoachesByCourseSlug(courseSlug),
  ])

  if (!course) {
    notFound()
  }

  const isComingSoon = course.status === 'coming_soon'

  const structuredData = [
    generateCourseStructuredData(course, coaches, courseSlug),
    generateFAQStructuredData(COURSE_FAQS),
    generateBreadcrumbStructuredData(course.title, courseSlug),
    generateSpeakableSchema(
      `https://ignite.education/courses/${courseSlug}`,
      course.title,
      ['.course-description', '.curriculum-section', 'h1', '.faq-section']
    ),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-white">
        <CourseHero
          course={course}
          courseSlug={courseSlug}
          isComingSoon={isComingSoon}
        />

        <div className="max-w-4xl mx-auto px-6 pb-12 flex justify-center">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <CourseCurriculum
              moduleStructure={course.module_structure}
              courseSlug={courseSlug}
              courseTitle={course.title}
              isComingSoon={isComingSoon}
            />

            {!isComingSoon && (
              <FeedbackSection courseTitle={course.title} />
            )}

            {coaches.length > 0 && (
              <CourseLeaders coaches={coaches} courseTitle={course.title} />
            )}

            <FAQSection faqs={COURSE_FAQS} />
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}
