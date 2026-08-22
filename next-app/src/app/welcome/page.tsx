import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getCoursesByType } from '@/lib/courseData'
import { getRecentPosts } from '@/lib/blogData'
import Footer from '@/components/Footer'
import TrustpilotBar from './TrustpilotBar'
import WelcomeHero from './WelcomeHero'
import EducationSection from './EducationSection'
import CoursesSection from './CoursesSection'
import LearningModelSection from './LearningModelSection'
import TestimonialsSection from './TestimonialsSection'
import MerchSection from './MerchSection'
import FAQSection from './FAQSection'
import WelcomeScrollManager from './WelcomeScrollManager'
import { OG_DEFAULTS, brandTitle, ogImages } from '@/lib/siteConfig'
import { SITE_FAQS } from '@/lib/faqs'

export const revalidate = 3600 // Revalidate at most once per hour

// No brand suffix — the root layout's `%s | Ignite` template adds it, and
// brandTitle() adds it to the social cards. This was 'Welcome', which carried
// no query surface on the page the apex root redirects to.
const TITLE = 'Free Online Courses, Built by Experts'

export const metadata: Metadata = {
  title: TITLE,
  description: 'Transform your career with Ignite\'s interactive courses in Product Management, Cyber Security, Data Analysis, and UX Design. Learn from industry experts with AI-powered lessons, real-world projects, and personalized feedback.',
  keywords: 'product management course, cyber security training, data analyst course, UX design course, online learning, AI-powered education, tech skills, career development, free online courses, tech career, professional development',
  alternates: {
    canonical: '/welcome',
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: brandTitle(TITLE),
    description: 'Transform your career with free, expert-led courses in Product Management, Cyber Security, Data Analysis, and more.',
    url: '/welcome',
    images: ogImages(),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: brandTitle(TITLE),
    description: 'Transform your career with free, expert-led courses.',
    images: ogImages(),
  },
}

// The site-level FAQs, shared with /jobs — see lib/faqs.ts. Still
// server-rendered for SEO, and this page is the only one that emits the
// FAQPage block below for them.
const faqs = SITE_FAQS

// Structured data for SEO
function generateStructuredData(coursesByType: { specialism: Array<{ name: string; title?: string; description?: string }>; skill: Array<{ name: string; title?: string; description?: string }>; subject: Array<{ name: string; title?: string; description?: string }> }) {
  const allCourses = [...(coursesByType.specialism || []), ...(coursesByType.skill || []), ...(coursesByType.subject || [])]

  return [
    // ItemList - Available courses
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Free Online Courses at Ignite Education",
      "description": "Expert-led courses in tech and professional skills",
      "itemListElement": allCourses.slice(0, 10).map((course, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Course",
          "name": course.title || course.name,
          "description": course.description || `Learn ${course.title || course.name} from industry experts`,
          "url": `https://ignite.education/courses/${course.name?.toLowerCase().replace(/\s+/g, '-')}`,
          "provider": { "@type": "Organization", "name": "Ignite Education" }
        }
      }))
    },
    // FAQPage
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    },
    // WebPage with Speakable
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Welcome to Ignite Education",
      "description": "Transform your career with free, expert-led courses in Product Management, Cyber Security, Data Analysis, and more.",
      "url": "https://ignite.education/welcome",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".hero-text", "h1", ".course-description", ".testimonial-text"]
      }
    }
  ]
}

export default async function WelcomePage() {
  const [coursesByType, recentPosts] = await Promise.all([
    getCoursesByType(),
    getRecentPosts(5),
  ])

  // Fetch all active coaches in a single query, then group by course (welcome-page specific)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: allCoaches } = await supabase
    .from('coaches')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const coachesMap: Record<string, Array<{ name: string; position?: string; description?: string; image_url?: string; linkedin_url?: string }>> = {}
  for (const course of coursesByType.specialism) {
    const slug = course.name.toLowerCase()
    const nameVariations = [
      course.name.toLowerCase(),
      slug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').toLowerCase(),
      slug.replace(/-/g, ' ')
    ]
    coachesMap[course.name] = (allCoaches || []).filter(
      (coach: { course_id?: string }) => nameVariations.includes(coach.course_id?.toLowerCase() ?? '')
    )
  }

  const structuredData = generateStructuredData(coursesByType)

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Above <main> and in normal flow: it pushes the page down when it
          opens, two seconds in. */}
      <TrustpilotBar />

      <main className="bg-black min-h-screen">
        {/* Section 1: Course Catalog */}
        <WelcomeHero coursesByType={coursesByType} />

        {/* Wrapper for sections 2-6 with sticky navbar + dynamic logo color */}
        <WelcomeScrollManager
          educationSection={<EducationSection />}
          coursesSection={<CoursesSection courses={coursesByType.specialism} coaches={coachesMap} />}
          learningModelSection={<LearningModelSection />}
          testimonialsSection={<TestimonialsSection />}
          merchSection={<MerchSection />}
          faqSection={<FAQSection faqs={faqs} posts={recentPosts} />}
          footer={<Footer />}
        />
      </main>
    </>
  )
}
