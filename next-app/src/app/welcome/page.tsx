import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Footer from '@/components/Footer'
import WelcomeHero from './WelcomeHero'
import EducationSection from './EducationSection'
import CoursesSection from './CoursesSection'
import LearningModelSection from './LearningModelSection'
import TestimonialsSection from './TestimonialsSection'
import FAQSection from './FAQSection'
import WelcomeScrollManager from './WelcomeScrollManager'

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

// Course type configuration
const COURSE_TYPE_CONFIG = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that\nenable you to enter a new career'
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that\nyou can immediately apply'
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to\nlearn anything you want'
  }
}

// Structured data for SEO
function generateStructuredData(coursesByType: Record<string, Array<{ name: string; title?: string; description?: string }>>) {
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

interface Course {
  id: string
  name: string
  title?: string
  description?: string
  image_url?: string
  status: string
  course_type?: string
  display_order?: number
  module_structure?: Array<{ name: string }>
  module_names?: string
}

export default async function WelcomePage() {
  // Fetch courses from Supabase at build time
  const supabase = await createClient()

  const { data: rawCourses } = await supabase
    .from('courses')
    .select('*')
    .in('status', ['live', 'coming_soon'])

  // Extract module_names from module_structure (matches Vite logic)
  const courses = (rawCourses || []).map((course: Course) => ({
    ...course,
    module_names: course.module_structure && Array.isArray(course.module_structure)
      ? course.module_structure.map(m => m.name).join(', ')
      : ''
  }))

  // Fetch coaches for all specialism courses
  const coachesMap: Record<string, Array<{ name: string; position?: string; description?: string; image_url?: string; linkedin_url?: string }>> = {}
  const specialismCourses = courses.filter((c: Course) => !c.course_type || c.course_type === 'specialism')
  for (const course of specialismCourses) {
    const slug = course.name.toLowerCase()
    const nameVariations = [
      course.name,
      slug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      slug.replace(/-/g, ' ')
    ]
    const { data: coachData } = await supabase
      .from('coaches')
      .select('*')
      .in('course_id', nameVariations)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    coachesMap[course.name] = coachData || []
  }

  // Sort courses: live first (alphabetically), then coming_soon (alphabetically)
  const sortCourses = (coursesToSort: Course[]) => {
    return coursesToSort.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'live' ? -1 : 1
      }
      return (a.title || a.name).localeCompare(b.title || b.name)
    })
  }

  // Group by course_type
  const coursesByType = {
    specialism: sortCourses((courses || []).filter((c: Course) => !c.course_type || c.course_type === 'specialism')),
    skill: sortCourses((courses || []).filter((c: Course) => c.course_type === 'skill')),
    subject: sortCourses((courses || []).filter((c: Course) => c.course_type === 'subject'))
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
        <WelcomeHero
          coursesByType={coursesByType}
          courseTypeConfig={COURSE_TYPE_CONFIG}
        />

        {/* Wrapper for sections 2-6 with sticky navbar + dynamic logo color */}
        <WelcomeScrollManager
          educationSection={<EducationSection />}
          coursesSection={<CoursesSection courses={coursesByType.specialism} coaches={coachesMap} />}
          learningModelSection={<LearningModelSection />}
          testimonialsSection={<TestimonialsSection />}
          faqSection={<FAQSection faqs={faqs} />}
          footer={<Footer />}
        />
      </main>
    </>
  )
}
