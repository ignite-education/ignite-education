'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { createClient } from '@/lib/supabase/client'
import { CourseTypeColumn, CourseSearch } from '@/components/catalog'
import CourseRequestModal from './CourseRequestModal'
import lottieData from '../../../public/icon-animation.json'

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
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestedQuery, setRequestedQuery] = useState('')
  const [modalPhase, setModalPhase] = useState<'sign-in' | 'thank-you'>('sign-in')
  const [modalUserName, setModalUserName] = useState('')
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)
  const [lottieReady, setLottieReady] = useState(false)

  useEffect(() => {
    if (lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

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

  const [isMobile, setIsMobile] = useState<boolean | null>(null) // null = pre-hydration
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const maxRows = Math.max(filteredSpecialism.length, filteredSkill.length, filteredSubject.length)
  const sectionHeight = maxRows >= 3 ? '85vh' : maxRows === 2 ? '75vh' : maxRows === 1 ? '65vh' : '55vh'
  const sectionMinHeight = maxRows >= 3 ? '600px' : maxRows === 2 ? '500px' : maxRows === 1 ? '400px' : '350px'
  const sectionMaxHeight = maxRows >= 3 ? '750px' : maxRows === 2 ? '650px' : maxRows === 1 ? '550px' : '450px'

  // Mobile: fixed computed height based on card counts (no DOM measurement)
  const CARD_HEIGHT = 59    // py-3 (24px) + 35px icon content
  const CARD_GAP = 12       // space-y-3
  const COLUMN_GAP = 12     // gap-3 on mobile (matches card gap)
  const FIXED_OVERHEAD = 280 // padding-top(36) + logo(88) + logo-mb(29) + h1-mt(-12) + h1(34) + header-mb(7) + search(48) + search-mb(32) + padding-bottom(16) + buffer(2)

  const computeMobileHeight = (spec: Course[], skill: Course[], subj: Course[]) => {
    const total = spec.length + skill.length + subj.length
    const cols = [spec, skill, subj].filter(c => c.length > 0).length
    if (total === 0) return 285
    if (total === 1) return 360
    if (total === 2) return 430
    if (total === 3) return 500
    if (total === 4) return 570
    return FIXED_OVERHEAD + total * CARD_HEIGHT + Math.max(0, total - cols) * CARD_GAP + Math.max(0, cols - 1) * COLUMN_GAP
  }

  const totalCards = filteredSpecialism.length + filteredSkill.length + filteredSubject.length
  const mobileSectionHeight = `${computeMobileHeight(filteredSpecialism, filteredSkill, filteredSubject)}px`

  // Initial mobile height from unfiltered courses — used in CSS media query to avoid hydration flash
  const initialMobileHeight = computeMobileHeight(coursesByType.specialism, coursesByType.skill, coursesByType.subject)

  return (
    <>
      {/* Pre-hydration mobile height — prevents flash before JS knows isMobile */}
      {isMobile === null && (
        <style>{`@media(max-width:767px){.auth-section-1--initial{height:${initialMobileHeight}px!important;max-height:85vh!important;min-height:auto!important}}`}</style>
      )}
      <section
        className={`relative bg-white auth-section-1${isMobile === null ? ' auth-section-1--initial' : ''}`}
        style={{
          height: isExpanded ? 'auto' : (isMobile ? mobileSectionHeight : sectionHeight),
          minHeight: isExpanded ? 'auto' : (isMobile ? undefined : sectionMinHeight),
          maxHeight: isExpanded ? 'none' : (isMobile ? '85vh' : sectionMaxHeight),
          transition: isMobile === null ? 'none' : 'height 0.8s cubic-bezier(0.25, 1, 0.5, 1), min-height 0.8s cubic-bezier(0.25, 1, 0.5, 1), max-height 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
          overflow: 'hidden'
        }}
      >
      <div
        className="relative w-full h-full flex flex-col max-w-[1267px] mx-auto px-6"
        style={{
          paddingTop: '2.25rem',
          paddingBottom: isExpanded ? '4rem' : '1rem',
          overflow: isExpanded ? 'visible' : 'hidden'
        }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-[7px]">
          <Link href="/" className="inline-block" style={{ marginBottom: '28.8px' }}>
            <div className="w-[88px] h-[88px] md:w-[80px] md:h-[80px] mx-auto relative">
              {/* Static first-frame placeholder — visible instantly, hidden once Lottie renders */}
              {!lottieReady && (
                <svg
                  viewBox="0 0 600 600"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                >
                  <rect x="92.5" y="92.5" width="415" height="415" fill="#EF0B72" />
                  <rect x="92.5" y="231.5" width="277" height="277" fill="#B30FA9" />
                  <rect x="93" y="370" width="138" height="138" fill="#7714E0" />
                </svg>
              )}
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieData}
                loop={true}
                autoplay={false}
                onDOMLoaded={() => setLottieReady(true)}
                onLoopComplete={() => {
                  loopCountRef.current += 1
                  if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                    lottieRef.current.pause()
                    setTimeout(() => {
                      lottieRef.current?.goToAndPlay(0)
                    }, 4000)
                  }
                }}
                style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
              />
            </div>
          </Link>
          <h1
            className="text-[1.7rem] md:text-[38px] font-bold text-black mb-[6px] tracking-[-0.02em] hero-text"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', marginTop: '-12px' }}
          >
            What do you want to learn?
          </h1>
        </div>

        {/* Search */}
        <div className="mb-8 md:mb-10">
          <CourseSearch
            value={searchQuery}
            onChange={setSearchQuery}
            showRequestButton={noResults}
            onRequestClick={handleRequestCourse}
          />
        </div>

        {/* Course Columns - 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[35px]">
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
                  <CourseTypeColumn type={type} courses={allCourses} searchQuery={searchQuery} hideHeader cardStaggerBase={baseDelay} />
                </div>
              )
              cardOffset += allCourses.length
              return el
            })
          })()}
        </div>
      </div>

      {/* Bottom gradient fade - fades in/out based on row count */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
          opacity: !isExpanded && (isMobile ? totalCards >= 7 : maxRows >= 3) ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Expand/Collapse Button - fades in/out based on row count */}
      <button
        onClick={() => {
          if (isExpanded && isMobile) {
            const start = window.scrollY
            const startTime = performance.now()
            const duration = 800
            const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const step = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1)
              window.scrollTo(0, start * (1 - ease(progress)))
              if (progress < 1) requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
          }
          setIsExpanded(!isExpanded)
        }}
        className="absolute bottom-4 right-6 md:right-10 py-2 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors text-center z-20"
        style={{
          letterSpacing: '-0.01em',
          borderRadius: '0.25rem',
          width: '85px',
          opacity: (isMobile ? totalCards >= 7 : maxRows >= 3) ? 1 : 0,
          pointerEvents: (isMobile ? totalCards >= 7 : maxRows >= 3) ? 'auto' : 'none',
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
    </>
  )
}
