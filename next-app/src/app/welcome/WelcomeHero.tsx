'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { createClient } from '@/lib/supabase/client'
import { CourseTypeColumn, CourseSearch } from '@/components/catalog'
import CourseRequestModal from './CourseRequestModal'

interface Course {
  id: string
  name: string
  title?: string
  description?: string
  status: string
}

interface WelcomeHeroProps {
  coursesByType: {
    specialism: Course[]
    skill: Course[]
    subject: Course[]
  }
}

export default function WelcomeHero({ coursesByType }: WelcomeHeroProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestedQuery, setRequestedQuery] = useState('')
  const [modalPhase, setModalPhase] = useState<'sign-in' | 'thank-you'>('sign-in')
  const [modalUserName, setModalUserName] = useState('')
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
    console.log('[LinkedIn callback] Checking auth for pending course:', pendingCourse)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        console.log('[LinkedIn callback] No authenticated user found')
        return
      }
      console.log('[LinkedIn callback] Authenticated as:', user.id, user.email)

      // User is authenticated and has a pending course request
      sessionStorage.removeItem('pendingCourseRequest')

      const firstName = user.user_metadata?.full_name?.split(' ')[0]
        || user.user_metadata?.name?.split(' ')[0]
        || user.email?.split('@')[0]
        || 'there'

      // Insert the course request with user_id
      supabase.from('course_requests').insert({
        user_id: user.id,
        course_name: pendingCourse,
      }).then(({ error }) => {
        if (error) {
          console.error('[LinkedIn callback] Insert failed:', error.message, error.code, error)
        } else {
          console.log('[LinkedIn callback] Insert succeeded for:', pendingCourse)
        }
        setRequestedQuery(pendingCourse)
        setModalPhase('thank-you')
        setModalUserName(firstName)
        setShowRequestModal(true)
      })
    })
  }, [])

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

  const hasSearchQuery = searchQuery.trim().length > 0
  const noResults = hasSearchQuery
    && filteredSpecialism.length === 0
    && filteredSkill.length === 0
    && filteredSubject.length === 0

  const maxRows = Math.max(filteredSpecialism.length, filteredSkill.length, filteredSubject.length)
  const sectionHeight = maxRows >= 3 ? '85vh' : maxRows === 2 ? '75vh' : maxRows === 1 ? '65vh' : '55vh'
  const sectionMinHeight = maxRows >= 3 ? '600px' : maxRows === 2 ? '500px' : maxRows === 1 ? '400px' : '350px'

  return (
    <section
      className="relative bg-white auth-section-1"
      style={{
        height: isExpanded ? 'auto' : sectionHeight,
        minHeight: isExpanded ? 'auto' : sectionMinHeight,
        transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1), min-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
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
            className="text-[38px] font-bold text-black mb-[6px] tracking-[-0.02em] hero-text"
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

      {/* Bottom gradient fade - fades in/out based on row count */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
          opacity: !isExpanded && maxRows >= 3 ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Expand/Collapse Button - fades in/out based on row count */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-4 right-10 py-2 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors text-center z-20"
        style={{
          letterSpacing: '-0.01em',
          borderRadius: '0.25rem',
          width: '85px',
          opacity: maxRows >= 3 ? 1 : 0,
          pointerEvents: maxRows >= 3 ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
      {showRequestModal && (
        <CourseRequestModal
          courseName={requestedQuery}
          onClose={() => { setShowRequestModal(false); setSearchQuery('') }}
          initialPhase={modalPhase}
          initialUserName={modalUserName}
        />
      )}
    </section>
  )
}
