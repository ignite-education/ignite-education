import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getCoursesByType } from '@/lib/courseData'
import Footer from '@/components/Footer'
import WelcomeHero from './WelcomeHero'
import EducationSection from './EducationSection'
import CoursesSection from './CoursesSection'
import LearningModelSection from './LearningModelSection'
import TestimonialsSection from './TestimonialsSection'
import MerchSection from './MerchSection'
import FAQSection from './FAQSection'
import WelcomeScrollManager from './WelcomeScrollManager'

export const revalidate = 3600 // Revalidate at most once per hour

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Transform your career with Ignite\'s interactive courses in Product Management, Cyber Security, Data Analysis, and UX Design. Learn from industry experts with AI-powered lessons, real-world projects, and personalized feedback.',
  keywords: 'product management course, cyber security training, data analyst course, UX design course, online learning, AI-powered education, tech skills, career development, free online courses, tech career, professional development',
  openGraph: {
    title: 'Welcome to Ignite Education',
    description: 'Transform your career with free, expert-led courses in Product Management, Cyber Security, Data Analysis, and more.',
    url: 'https://ignite.education/welcome',
    siteName: 'Ignite Education',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Welcome to Ignite Education',
    description: 'Transform your career with free, expert-led courses.',
  },
}

// FAQs data - server-rendered for SEO
const faqs = [
  {
    question: 'What is Ignite?',
    answer: 'Ignite gives you free, expert-led courses in high-demand careers like Product Management and Cybersecurity, so you can build the skills that actually get you hired in today\'s competitive job market.'
  },
  {
    question: 'Who is Ignite for?',
    answer: 'Ignite is for anyone ready to level up their career, especially students, recent graduates, and young professionals looking to break into competitive fields, switch careers, or gain new skills quickly.'
  },
  {
    question: 'How much does Ignite cost?',
    answer: 'Ignite courses are completely free, supported by limited advertising. Want an ad-free experience plus exclusive access to industry professionals and curated job opportunities? Upgrade for just 99p/week.'
  },
  {
    question: 'What can I learn on Ignite?',
    answer: 'We offer comprehensive courses in Product Management and Cyber Security, with more fields launching soon. Each course includes interactive lessons, knowledge checks and certification to boost your CV.'
  },
  {
    question: 'Can I learn at my own pace?',
    answer: 'Absolutely. Ignite courses are self-paced, so you can learn when and where it works best for you. We suggest completing 2 to 4 lessons per week for the best results and maximum knowledge retention.'
  },
  {
    question: 'What makes Ignite different?',
    answer: 'Unlike other platforms, Ignite is completely free with no paywalls or hidden costs. We focus on practical, industry-relevant skills that employers actually want, not just theory. Our courses get you job-ready, fast.'
  }
]

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
  const coursesByType = await getCoursesByType()

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
          faqSection={<FAQSection faqs={faqs} />}
          footer={<Footer />}
        />
      </main>
    </>
  )
}
