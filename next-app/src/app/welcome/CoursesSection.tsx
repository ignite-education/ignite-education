'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import useTypingAnimation from '@/hooks/useTypingAnimation'

interface Lesson {
  name: string
}

interface Module {
  name: string
  lessons?: Lesson[]
}

interface Coach {
  name: string
  position?: string
  description?: string
  image_url?: string
  linkedin_url?: string
}

interface Course {
  name: string
  title?: string
  description?: string
  module_names?: string
  module_structure?: Module[]
  status: string
  course_type?: string
}

interface CoursesSectionProps {
  courses: Course[]
  coaches: Record<string, Coach[]>
}

// Course Card for Section 3 - 2x2 grid style
function CourseCard({ course, onClick, isMobile }: { course: Course; onClick?: () => void; isMobile?: boolean }) {
  // Get first sentence of description
  const getFirstSentence = (desc: string) => {
    const firstSentenceEnd = desc.indexOf('. ')
    return firstSentenceEnd !== -1 ? desc.substring(0, firstSentenceEnd + 1) : desc
  }

  return (
    <div
      className="relative cursor-pointer flex-shrink-0 auth-course-card w-[270px] h-[270px] md:w-[249px] md:h-[249px]"
      style={{ overflow: 'visible', transform: 'translateZ(0)' }}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 text-black rounded-[8px] flex flex-col justify-start cursor-pointer auth-course-card-inner"
        style={{ backgroundColor: '#F6F6F6', transformOrigin: 'center', zIndex: 1, overflow: 'hidden' }}
      >
        <div
          className="flex flex-col auth-course-card-content"
          style={{
            paddingTop: '13px',
            paddingLeft: '13px',
            paddingRight: '13px',
            paddingBottom: '13px',
            backgroundColor: '#F6F6F6',
            borderRadius: 'inherit',
          }}
        >
          <h4
            className="text-lg font-semibold auth-course-card-title"
            style={{ color: '#7714E0', marginBottom: '5.1px', lineHeight: '23px' }}
          >
            {course.title || course.name}
          </h4>
          {course.description && (
            <p
              className="text-black mb-2 auth-course-card-description"
              style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
            >
              {getFirstSentence(course.description)}
            </p>
          )}
          {course.module_names && (
            <div className="auth-course-card-modules">
              <p className="text-black font-semibold mb-1" style={{ fontSize: '0.85rem' }}>Modules:</p>
              <ul className="text-black space-y-0" style={{ fontSize: '0.85rem' }}>
                {course.module_names.split(', ').slice(0, isMobile ? ((course.title || course.name).length > 20 ? 4 : 5) : ((course.title || course.name).length > 20 ? 3 : 4)).map((moduleName, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-1.5">•</span>
                    <span className="line-clamp-1">{moduleName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Plus Icon */}
        <div
          className="absolute bottom-3 right-3 flex items-center justify-center rounded text-black bg-white"
          style={{ width: '1.7rem', height: '1.7rem' }}
        >
          <svg
            style={{ width: '1.0625rem', height: '1.0625rem' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function CoursesSection({ courses, coaches }: CoursesSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [typingEnabled, setTypingEnabled] = useState(false)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { isComplete, charIndex } = useTypingAnimation(
    'The best courses.\nFor the best students.',
    {
      charDelay: 75,
      startDelay: 0,
      pausePoints: [{ after: 17, duration: 1000 }],
      enabled: typingEnabled
    }
  )

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTypingEnabled(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Detect card visibility for blur effect on course grid (DOM-based to avoid re-renders)
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || courses.length === 0) return

    let rafId = 0

    const updateCardBlur = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const cards = scrollContainer.querySelectorAll<HTMLElement>('[data-course-card]')
        const containerRect = scrollContainer.getBoundingClientRect()
        const containerLeft = containerRect.left
        const mobile = window.innerWidth < 768
        const viewportWidth = window.innerWidth

        cards.forEach((card) => {
          const cardLeft = card.getBoundingClientRect().left
          const shouldBlur = mobile
            ? cardLeft > viewportWidth / 2
            : cardLeft - containerLeft > 520

          card.style.filter = shouldBlur ? 'blur(1px) brightness(0.95)' : 'none'
        })
      })
    }

    updateCardBlur()

    let resizeTimeout: ReturnType<typeof setTimeout>
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateCardBlur, 100)
    }

    scrollContainer.addEventListener('scroll', updateCardBlur, { passive: true })
    window.addEventListener('resize', debouncedResize)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(resizeTimeout)
      scrollContainer.removeEventListener('scroll', updateCardBlur)
      window.removeEventListener('resize', debouncedResize)
    }
  }, [courses])

  const renderTypedTitle = () => {
    const fullText = 'The best courses.\nFor the best students.'
    const firstLineLength = 'The best courses.'.length
    const result: React.ReactNode[] = []

    for (let i = 0; i < fullText.length; i++) {
      if (fullText[i] === '\n') {
        result.push(<br key={`br-${i}`} />)
        continue
      }

      const isSecondLine = i > firstLineLength
      let end = fullText.length
      for (let j = i; j < fullText.length; j++) {
        if (fullText[j] === '\n') {
          end = j
          break
        }
      }

      const chunk = fullText.substring(i, end)
      if (chunk) {
        const typedCount = Math.max(0, Math.min(charIndex - i, chunk.length))
        const typedPart = chunk.substring(0, typedCount)
        const untypedPart = chunk.substring(typedCount)
        const color = isSecondLine ? '#EF0B72' : 'black'

        result.push(
          <span key={`chunk-${i}`}>
            {typedPart && <span style={{ color }}>{typedPart}</span>}
            {untypedPart && <span style={{ color: 'transparent' }}>{untypedPart}</span>}
          </span>
        )
        i = end - 1
      }
    }

    if (!isComplete) {
      result.push(
        <span key="cursor" className="animate-blink font-thin" style={{ color: 'white', marginLeft: '-0.1em' }}>|</span>
      )
    }

    return result
  }

  // Group courses into pages of 4
  const pages: Course[][] = []
  for (let i = 0; i < courses.length; i += 4) {
    pages.push(courses.slice(i, i + 4))
  }

  return (
  <>
    <section
      ref={sectionRef}
      className="flex items-start justify-center px-8 md:px-10 relative auth-section-3"
      style={{ background: 'white', overflow: 'visible', paddingTop: isMobile ? '55px' : '3rem', paddingBottom: isMobile ? '2rem' : '3rem' }}
    >
      <div className="w-full text-white">
        {/* Two Column Layout */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? 'gap-[25px]' : 'gap-12'} max-w-6xl mx-auto items-center auth-section-3-grid`}>
          {/* Left Column - Description */}
          <div
            className="flex items-center justify-start md:justify-center auth-section-3-left"
            style={{ paddingLeft: isMobile ? '0' : '2rem', paddingRight: isMobile ? '0' : '1rem' }}
          >
            <div className="flex flex-col items-start">
              <h3
                className="font-bold text-left auth-section-3-title"
                style={{
                  fontSize: isMobile ? '2.1rem' : '2.5rem',
                  lineHeight: '1.2',
                  minHeight: isMobile ? '7.5rem' : '6rem',
                  marginBottom: isMobile ? '1rem' : '1rem',
                  color: 'black'
                }}
              >
                {renderTypedTitle()}
              </h3>
              <p
                className="text-base md:text-lg max-w-2xl text-left auth-section-3-description"
                style={{ lineHeight: '1.425', color: 'black', marginBottom: 0 }}
              >
                We work backwards from industry professionals to build bespoke courses.
                Because of this, our course content is comprehensive, relevant and
                in-demand by employers.
              </p>
              <Image
                src="https://auth.ignite.education/storage/v1/object/public/assets/Trustpilot_brandmark_gr-blk_RGB-576x144-XL.png"
                alt="Trustpilot"
                width={576}
                height={144}
                loading="lazy"
                style={{ maxWidth: isMobile ? '107px' : '113px', height: 'auto', marginTop: '15px' }}
              />
            </div>
          </div>

          {/* Right Column - Swipeable 2x2 Course Grid */}
          <div
            className="relative auth-section-3-right"
            style={{ marginLeft: '0', marginRight: '-50px', overflow: 'visible' }}
          >
            <div
              ref={scrollRef}
              className="overflow-x-auto overflow-y-hidden auth-course-cards-scroll hide-scrollbar"
              style={{
                scrollSnapType: 'x mandatory',
                paddingLeft: isMobile ? '0' : '30px',
                paddingRight: isMobile ? '3rem' : '315px',
                paddingTop: isMobile ? '15px' : '30px',
                paddingBottom: isMobile ? '0' : '30px',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex gap-3 auth-course-cards-container" style={{ marginRight: isMobile ? '0' : '320px' }}>
                {pages.length > 0 ? (
                  pages.map((pageCourses, pageIndex) => (
                    <div
                      key={`page-${pageIndex}`}
                      className="grid grid-cols-2 gap-3 flex-shrink-0 auth-course-cards-grid"
                      style={{
                        width: isMobile ? '552px' : '510px',
                        minWidth: isMobile ? '552px' : '510px',
                        maxWidth: isMobile ? '552px' : '510px',
                        overflow: 'visible'
                      }}
                    >
                      {pageCourses.map((course) => {
                        return (
                          <div
                            key={course.name}
                            data-course-card
                            style={{
                              transition: 'filter 200ms ease-out',
                              willChange: 'filter'
                            }}
                          >
                            <CourseCard
                              course={course}
                              isMobile={isMobile}
                              onClick={() => {
                                const slug = course.name?.toLowerCase().replace(/\s+/g, '-')
                                window.open(`/courses/${slug}`, '_blank')
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  // Skeleton cards while loading
                  <div
                    className="grid grid-cols-2 gap-3 flex-shrink-0"
                    style={{ width: isMobile ? '552px' : '510px' }}
                  >
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-[#F6F6F6] rounded-[8px] aspect-square flex flex-col justify-start overflow-hidden animate-pulse w-[270px] h-[270px] md:w-[249px] md:h-[249px]"
                        style={{ padding: '16px' }}
                      >
                        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-300 rounded w-full mb-1" />
                        <div className="h-4 bg-gray-300 rounded w-5/6 mb-1" />
                        <div className="h-4 bg-gray-300 rounded w-4/5 mb-3" />
                      </div>
                    ))}
                  </div>
                )}
                {/* Spacer to ensure right-side gap when scrolled to end */}
                {isMobile && <div className="flex-shrink-0" style={{ width: '2rem' }} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop image - positioned to overlap sections 3 and 4 */}
      <div
        className="hidden md:block"
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: '100%',
          maxWidth: '72rem',
          paddingLeft: '2rem',
          paddingRight: '1rem',
          pointerEvents: 'none'
        }}
      >
        <Image
          src="https://auth.ignite.education/storage/v1/object/public/assets/envato-labs-image-edit.jpg"
          alt="Ignite interactive course curriculum showing AI-powered lessons, flashcards, and knowledge checks"
          className="rounded-lg auth-section-3-image"
          width={1400}
          height={900}
          loading="lazy"
          style={{ width: '35.7%', maxWidth: '446px', height: 'auto', transform: 'translateY(50%)' }}
        />
      </div>
    </section>

  </>
  )
}
