'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { createClient } from '@/lib/supabase/client'
import { CourseTypeColumn, CourseSearch } from '@/components/catalog'
import { courseMatchesQuery, shouldOfferRequest } from '@/lib/courseUtils'
import CourseRequestModal from '@/app/welcome/CourseRequestModal'
import type { CoursesByType } from '@/lib/courseData'

interface CourseCatalogClientProps {
  coursesByType: CoursesByType
  /** Hide the centered Ignite logo above the heading (e.g. on the profile page, which has its own logo) */
  hideLogo?: boolean
  /** Open course links in a new tab, so the host page is not lost. Forwarded to CourseCard. */
  openInNewTab?: boolean
  /**
   * Constrain the section to a viewport-height band with a bottom fade and an
   * Expand/Collapse control, as on /welcome. Off on /courses, where the catalog
   * is the page and should simply run to its full length.
   */
  collapsible?: boolean
}

export default function CourseCatalogClient({ coursesByType, hideLogo = false, openInNewTab = false, collapsible = false }: CourseCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
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
  // Gates the Enter shortcut only — the button itself is offered on query
  // length, whatever the results.
  const noResults = hasSearchQuery
    && filteredSpecialism.length === 0
    && filteredSkill.length === 0
    && filteredSubject.length === 0
  const showRequest = shouldOfferRequest(searchQuery, noResults)

  // ---- Collapsible band (mirrors WelcomeHero) --------------------------------
  // Desktop height is driven by the longest column; mobile is a computed pixel
  // height because vh units there include the browser chrome.
  const maxRows = Math.max(filteredSpecialism.length, filteredSkill.length, filteredSubject.length)
  const totalCards = filteredSpecialism.length + filteredSkill.length + filteredSubject.length
  const sectionHeight = maxRows >= 3 ? '85vh' : maxRows === 2 ? '75vh' : maxRows === 1 ? '65vh' : '55vh'
  // 550px at the top end, against WelcomeHero's 750px — deliberate divergence:
  // this band sits below a hero rather than being the landing view.
  // minHeight has to come down with it: min-height beats max-height in CSS, so
  // leaving it at 600 would silently pin the band at 600 and ignore the cap.
  const sectionMinHeight = maxRows >= 3 ? '500px' : maxRows === 2 ? '450px' : maxRows === 1 ? '400px' : '350px'
  const sectionMaxHeight = maxRows >= 2 ? '550px' : maxRows === 1 ? '500px' : '450px'

  const CARD_HEIGHT = 59   // py-3 (24px) + 35px icon content
  const CARD_GAP = 12      // CourseTypeColumn's per-card marginBottom
  const COLUMN_GAP = 35    // gap-[35px] (WelcomeHero drops to gap-3 on mobile)
  // Everything above the first card. WelcomeHero's equivalent is 280 with its
  // logo; this variant omits the 88px logo + 29px margin and swaps welcome's
  // 36/16 padding for pt-12/pb-12.
  const FIXED_OVERHEAD = hideLogo ? 227 : 280

  const computeMobileHeight = (spec: number, skill: number, subj: number) => {
    const total = spec + skill + subj
    const cols = [spec, skill, subj].filter(c => c > 0).length
    if (total === 0) return FIXED_OVERHEAD
    return FIXED_OVERHEAD
      + total * CARD_HEIGHT
      + Math.max(0, total - cols) * CARD_GAP
      + Math.max(0, cols - 1) * COLUMN_GAP
  }

  const mobileSectionHeight = `${computeMobileHeight(filteredSpecialism.length, filteredSkill.length, filteredSubject.length)}px`
  // From the unfiltered set, injected as CSS so mobile has a height before JS
  // knows isMobile — without it the band flashes at its desktop vh on load.
  const initialMobileHeight = computeMobileHeight(
    coursesByType.specialism.length, coursesByType.skill.length, coursesByType.subject.length
  )

  // Same thresholds as WelcomeHero: the control only appears once there is
  // genuinely something hidden below the fold.
  const showExpandControl = collapsible && (isMobile ? totalCards >= 7 : maxRows >= 3)

  const bandStyle = collapsible ? {
    height: isExpanded ? 'auto' : (isMobile ? mobileSectionHeight : sectionHeight),
    minHeight: isExpanded ? 'auto' : (isMobile ? undefined : sectionMinHeight),
    maxHeight: isExpanded ? 'none' : (isMobile ? '85vh' : sectionMaxHeight),
    transition: isMobile === null
      ? 'none'
      : 'height 0.8s cubic-bezier(0.25, 1, 0.5, 1), min-height 0.8s cubic-bezier(0.25, 1, 0.5, 1), max-height 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
    overflow: 'hidden',
  } : undefined

  return (
    <>
    {/* Pre-hydration mobile height — prevents a flash at the desktop vh before
        JS knows isMobile. Same trick as WelcomeHero's auth-section-1--initial. */}
    {collapsible && isMobile === null && (
      <style>{`@media(max-width:767px){.catalog-band--initial{height:${initialMobileHeight}px!important;max-height:85vh!important;min-height:auto!important}}`}</style>
    )}
    <div
      className={`bg-white relative${collapsible && isMobile === null ? ' catalog-band--initial' : ''}`}
      style={bandStyle}
    >
      {/* Without the logo (profile pages) nothing sits above the heading, so the
          band needs its own top padding — mirroring pb-12 — or the H1 butts
          straight against the section above it. */}
      <div
        className={`max-w-[1267px] mx-auto px-6${collapsible ? ' w-full h-full flex flex-col' : ''}`}
        style={{
          paddingTop: hideLogo ? '3rem' : undefined,
          paddingBottom: collapsible ? (isExpanded ? '4rem' : '1rem') : '3rem',
          overflow: collapsible && !isExpanded ? 'hidden' : undefined,
        }}
      >
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
            // The -12px exists to tighten the gap to the Lottie logo; with no
            // logo there is nothing to tighten against, so it just eats padding.
            style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              marginTop: hideLogo ? 0 : '-12px',
            }}
          >
            What do you want to learn?
          </h1>
        </div>

        {/* Search */}
        <div className="mb-10">
          <CourseSearch
            value={searchQuery}
            onChange={setSearchQuery}
            showRequestButton={showRequest}
            requestOnEnter={noResults}
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
                  <CourseTypeColumn type={type} courses={allCourses} searchQuery={searchQuery} cardStaggerBase={baseDelay} openInNewTab={openInNewTab} />
                </div>
              )
              cardOffset += allCourses.length
              return el
            })
          })()}
        </div>
      </div>

      {collapsible && (
        <>
          {/* Bottom gradient fade — signals the band is clipped */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
              opacity: !isExpanded && showExpandControl ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          <button
            onClick={() => {
              // Collapsing on mobile leaves you scrolled past the section, so
              // ease back to the top the way WelcomeHero does.
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
              opacity: showExpandControl ? 1 : 0,
              pointerEvents: showExpandControl ? 'auto' : 'none',
              transition: 'opacity 0.3s ease',
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </>
      )}

      {showRequestModal && (
        <CourseRequestModal
          courseName={requestedQuery}
          onClose={() => { setShowRequestModal(false); setSearchQuery('') }}
          initialPhase={modalPhase}
          initialUserName={modalUserName}
        />
      )}
    </div>
    </>
  )
}
