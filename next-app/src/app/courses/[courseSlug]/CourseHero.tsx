'use client'

import useTypingAnimation from '@/hooks/useTypingAnimation'
import { getCourseTypeLabel, getCourseTagline, getTwoSentences } from '@/lib/courseUtils'
import type { Course } from '@/types/course'
import Navbar from '@/components/Navbar'
import EnrollmentCTA from './EnrollmentCTA'

interface CourseHeroProps {
  course: Course
  courseSlug: string
  isComingSoon: boolean
}

export default function CourseHero({ course, courseSlug, isComingSoon }: CourseHeroProps) {
  const { displayText: displayedTitle, isComplete: isTypingComplete } = useTypingAnimation(
    course.title,
    {
      charDelay: 75,
      startDelay: 750,
      enabled: true,
    }
  )

  return (
    <>
      <div className="sticky top-0 z-50">
        <Navbar variant="black" />
      </div>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-6 pb-[38px] flex justify-center" style={{ paddingTop: '75px' }}>
          <div className="w-full text-center" style={{ maxWidth: '700px' }}>
            {/* Category Tag */}
            <span
              className="inline-block px-2 py-1 text-sm bg-[#EDEDED] rounded-sm font-medium"
              style={{ letterSpacing: '-0.02em', marginBottom: '30px' }}
            >
              {getCourseTypeLabel(course)}
            </span>

            {/* Title with typing animation */}
            <h1
              className="text-[38px] font-bold text-black mb-[15px] leading-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span style={{ display: 'inline-block', textAlign: 'left' }}>
                {displayedTitle}
                {!isTypingComplete && (
                  <span style={{ opacity: 0 }}>{course.title.substring(displayedTitle.length)}</span>
                )}
              </span>
            </h1>

            {/* Tagline */}
            <p
              className="text-xl text-[#7714E0] font-semibold leading-relaxed"
              style={{ letterSpacing: '-0.02em', marginBottom: '6px' }}
            >
              {getCourseTagline(course)}
            </p>

            {/* Description */}
            <p
              className="text-black text-lg leading-relaxed font-medium course-description"
              style={{ letterSpacing: '-0.02em', marginBottom: '30px' }}
            >
              {getTwoSentences(course.description)}
            </p>

            {/* Course Benefits */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </div>
                <span className="text-sm text-black leading-tight" style={{ letterSpacing: '-0.01em' }}>
                  Certificate upon<br />completion
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <span className="text-sm text-black leading-tight" style={{ letterSpacing: '-0.01em' }}>
                  Built by<br />industry experts
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-black leading-tight" style={{ letterSpacing: '-0.01em' }}>
                  Self-paced<br />learning
                </span>
              </div>
            </div>

            {/* Mobile CTA (hidden on desktop where sidebar CTA shows) */}
            <div className="lg:hidden">
              <EnrollmentCTA
                courseSlug={courseSlug}
                courseTitle={course.title}
                isComingSoon={isComingSoon}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
