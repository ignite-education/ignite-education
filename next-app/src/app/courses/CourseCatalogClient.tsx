'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { createClient } from '@/lib/supabase/client'
import { CourseTypeColumn, CourseSearch } from '@/components/catalog'
import { courseMatchesQuery } from '@/lib/courseUtils'
import CourseRequestModal from '@/app/welcome/CourseRequestModal'
import type { CoursesByType } from '@/lib/courseData'

interface CourseCatalogClientProps {
  coursesByType: CoursesByType
  /** Hide the centered Ignite logo above the heading (e.g. on the profile page, which has its own logo) */
  hideLogo?: boolean
}

export default function CourseCatalogClient({ coursesByType, hideLogo = false }: CourseCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestedQuery, setRequestedQuery] = useState('')
  const [modalPhase, setModalPhase] = useState<'sign-in' | 'thank-you'>('sign-in')
  const [modalUserName, setModalUserName] = useState('')
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)

  const [isMobile, setIsMobile] = useState<boolean | null>(null) // null = pre-hydration
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
    setModalPhase('sign-in')
    setModalUserName('')
    setShowRequestModal(true)
  }

  // LinkedIn OAuth callback detection
  useEffect(() => {
    const pendingCourse = sessionStorage.getItem('pendingCourseRequest')
    if (!pendingCourse) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      sessionStorage.removeItem('pendingCourseRequest')

      const firstName = user.user_metadata?.full_name?.split(' ')[0]
        || user.user_metadata?.name?.split(' ')[0]
        || user.email?.split('@')[0]
        || 'there'

      supabase.from('course_requests').insert({
        user_id: user.id,
        course_name: pendingCourse,
      }).then(() => {
        setRequestedQuery(pendingCourse)
        setModalPhase('thank-you')
        setModalUserName(firstName)
        setShowRequestModal(true)
      })
    })
  }, [])

  const filterCourses = (courses: typeof coursesByType.specialism) =>
    courses.filter((course) => courseMatchesQuery(course, searchQuery))

  const filteredSpecialism = filterCourses(coursesByType.specialism)
  const filteredSkill = filterCourses(coursesByType.skill)
  const filteredSubject = filterCourses(coursesByType.subject)

  const hasSearchQuery = searchQuery.trim().length > 0
  const noResults = hasSearchQuery
    && filteredSpecialism.length === 0
    && filteredSkill.length === 0
    && filteredSubject.length === 0

  return (
    <div className="bg-white pb-12">
      <div className="max-w-[1267px] mx-auto px-6">
        {/* Header with Lottie logo */}
        <div className="text-center mb-[7px]">
          {!hideLogo && (
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
          )}
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
          {(() => {
            const columns = [
              { type: 'specialism' as const, allCourses: coursesByType.specialism, filteredCount: filteredSpecialism.length },
              { type: 'skill' as const, allCourses: coursesByType.skill, filteredCount: filteredSkill.length },
              { type: 'subject' as const, allCourses: coursesByType.subject, filteredCount: filteredSubject.length },
            ]
            let cardOffset = 0
            return columns.map(({ type, allCourses, filteredCount }) => {
              const baseDelay = isMobile
                ? 0.15 + cardOffset * 0.1
                : 0.15
              const el = (
                <div key={type} className={filteredCount === 0 && hasSearchQuery ? 'hidden md:block' : ''}>
                  <CourseTypeColumn type={type} courses={allCourses} searchQuery={searchQuery} cardStaggerBase={baseDelay} />
                </div>
              )
              cardOffset += allCourses.length
              return el
            })
          })()}
        </div>
      </div>

      {showRequestModal && (
        <CourseRequestModal
          courseName={requestedQuery}
          onClose={() => { setShowRequestModal(false); setSearchQuery('') }}
          initialPhase={modalPhase}
          initialUserName={modalUserName}
        />
      )}
    </div>
  )
}
