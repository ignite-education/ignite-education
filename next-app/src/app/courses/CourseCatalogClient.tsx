'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { CourseTypeColumn, CourseSearch } from '@/components/catalog'
import CourseRequestModal from '@/app/welcome/CourseRequestModal'
import type { CoursesByType } from '@/lib/courseData'

interface CourseCatalogClientProps {
  coursesByType: CoursesByType
}

export default function CourseCatalogClient({ coursesByType }: CourseCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestedQuery, setRequestedQuery] = useState('')
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)

  // Load Lottie animation
  useEffect(() => {
    fetch('/icon-animation.json')
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(() => {})
  }, [])

  // Delayed Lottie start (2s delay, 3 loops with pause)
  useEffect(() => {
    if (lottieData && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [lottieData])

  const handleRequestCourse = () => {
    setRequestedQuery(searchQuery.trim())
    setShowRequestModal(true)
  }

  const filterCourses = (courses: typeof coursesByType.specialism) => {
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

  const hasSearchQuery = searchQuery.trim().length > 0
  const noResults = hasSearchQuery
    && filteredSpecialism.length === 0
    && filteredSkill.length === 0
    && filteredSubject.length === 0

  return (
    <div className="bg-white py-12">
      <div className="max-w-[1267px] mx-auto px-6">
        {/* Header with Lottie logo */}
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
                  if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                    lottieRef.current.pause()
                    setTimeout(() => {
                      lottieRef.current?.goToAndPlay(0)
                    }, 4000)
                  }
                }}
                style={{ width: 80, height: 80, margin: '0 auto' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, margin: '0 auto' }} />
            )}
          </Link>
          <h1
            className="text-[38px] font-bold text-black mb-[6px] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', marginTop: '-12px' }}
          >
            What do you want to learn?
          </h1>
        </div>

        {/* Search */}
        <div className="mb-10">
          <CourseSearch
            value={searchQuery}
            onChange={setSearchQuery}
            showRequestButton={noResults}
            onRequestClick={handleRequestCourse}
          />
        </div>

        {/* Course Columns - 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[35px]">
          <CourseTypeColumn type="specialism" courses={filteredSpecialism} />
          <CourseTypeColumn type="skill" courses={filteredSkill} />
          <CourseTypeColumn type="subject" courses={filteredSubject} />
        </div>
      </div>

      {showRequestModal && (
        <CourseRequestModal
          courseName={requestedQuery}
          onClose={() => { setShowRequestModal(false); setSearchQuery('') }}
        />
      )}
    </div>
  )
}
