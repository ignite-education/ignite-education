'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'

interface Course {
  id: string
  name: string
  title?: string
  description?: string
  status: string
}

interface CourseTypeConfig {
  title: string
  description: string
}

interface WelcomeHeroProps {
  coursesByType: {
    specialism: Course[]
    skill: Course[]
    subject: Course[]
  }
  courseTypeConfig: Record<string, CourseTypeConfig>
}

// Course Card component - matches original exactly
function CourseCard({ course }: { course: Course }) {
  const slug = course.name?.toLowerCase().replace(/\s+/g, '-') || course.title?.toLowerCase().replace(/\s+/g, '-')

  return (
    <Link
      href={`/courses/${slug}`}
      className="group block bg-[#F8F8F8] rounded-xl px-5 py-3"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-black font-semibold tracking-[-0.01em]"
          style={{ fontFamily: 'Geist, sans-serif' }}
        >
          {course.title || course.name}
        </span>
        <div
          className="bg-white rounded-md flex items-center justify-center"
          style={{ width: '35px', height: '35px' }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#D8D8D8] group-hover:text-[#EF0B72] transition-colors"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

// Course Type Column component - matches original exactly
function CourseTypeColumn({
  type,
  courses,
  config,
  showDescription = true
}: {
  type: string
  courses: Course[]
  config: CourseTypeConfig
  showDescription?: boolean
}) {
  return (
    <div className="flex flex-col">
      <h2
        className="text-[22px] font-bold text-[#EF0B72] mb-1 text-center tracking-[-0.01em]"
        style={{ fontFamily: 'Geist, sans-serif' }}
      >
        {config.title}
      </h2>
      {showDescription && (
        <p
          className="text-black text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line"
          style={{ fontFamily: 'Geist, sans-serif' }}
        >
          {config.description}
        </p>
      )}
      <div className="space-y-3">
        {courses.map((course) => (
          <CourseCard key={course.id || course.name} course={course} />
        ))}
      </div>
    </div>
  )
}

// Search component - matches original exactly
function CourseSearch({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="w-full max-w-[660px] mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        autoFocus
        className="w-full bg-white rounded-xl px-6 py-3 text-gray-900 caret-[#EF0B72] focus:outline-none transition-all"
        style={{ boxShadow: '0 0 10px rgba(103,103,103,0.5)' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 10px rgba(103,103,103,0.7)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 10px rgba(103,103,103,0.5)'}
      />
    </div>
  )
}

export default function WelcomeHero({ coursesByType, courseTypeConfig }: WelcomeHeroProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)

  useEffect(() => {
    fetch('/icon-animation.json')
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (lottieData && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [lottieData])

  // Filter courses based on search
  const filterCourses = (courses: Course[]) => {
    if (!searchQuery.trim()) return courses
    const query = searchQuery.toLowerCase()
    return courses.filter(
      (course) =>
        course.title?.toLowerCase().includes(query) ||
        course.name?.toLowerCase().includes(query)
    )
  }

  const filteredSpecialism = filterCourses(coursesByType.specialism)
  const filteredSkill = filterCourses(coursesByType.skill)
  const filteredSubject = filterCourses(coursesByType.subject)

  return (
    <section
      className="relative bg-white auth-section-1"
      style={{
        height: isExpanded ? 'auto' : '85vh',
        minHeight: isExpanded ? 'auto' : '600px',
        overflow: 'hidden'
      }}
    >
      <div
        className="relative w-full h-full flex flex-col max-w-[1267px] mx-auto px-6"
        style={{
          paddingTop: '2.25rem',
          paddingBottom: isExpanded ? '2rem' : '1rem',
          overflow: isExpanded ? 'visible' : 'hidden'
        }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-[7px]">
          <Link href="/" className="inline-block" style={{ marginBottom: '28.8px' }}>
            {lottieData ? (
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieData}
                loop={true}
                autoplay={false}
                onLoopComplete={() => {
                  loopCountRef.current += 1
                  if (loopCountRef.current >= 3 && lottieRef.current) {
                    lottieRef.current.stop()
                  }
                }}
                style={{ width: 80, height: 80, margin: '0 auto' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, margin: '0 auto' }} />
            )}
          </Link>
          <h1
            className="text-[38px] font-bold text-black mb-[6px] tracking-[-0.02em] hero-text"
            style={{ fontFamily: 'Geist, sans-serif', marginTop: '-12px' }}
          >
            What do you want to learn?
          </h1>
        </div>

        {/* Search */}
        <div className="mb-10">
          <CourseSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Course Columns - 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[35px]">
          <CourseTypeColumn
            type="specialism"
            courses={filteredSpecialism}
            config={courseTypeConfig.specialism}
            showDescription={true}
          />
          <CourseTypeColumn
            type="skill"
            courses={filteredSkill}
            config={courseTypeConfig.skill}
            showDescription={true}
          />
          <CourseTypeColumn
            type="subject"
            courses={filteredSubject}
            config={courseTypeConfig.subject}
            showDescription={true}
          />
        </div>
      </div>

      {/* Bottom gradient fade - only show when not expanded */}
      {!isExpanded && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
          }}
        />
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-4 right-10 py-2 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors text-center z-20"
        style={{ letterSpacing: '-0.01em', borderRadius: '0.25rem', width: '85px' }}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
    </section>
  )
}
