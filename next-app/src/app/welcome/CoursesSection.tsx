'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import useTypingAnimation from '@/hooks/useTypingAnimation'
import CourseModal from './CourseModal'

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
function CourseCard({ course, onClick }: { course: Course; onClick?: () => void }) {
  // Get first sentence of description
  const getFirstSentence = (desc: string) => {
    const firstSentenceEnd = desc.indexOf('. ')
    return firstSentenceEnd !== -1 ? desc.substring(0, firstSentenceEnd + 1) : desc
  }

  return (
    <div
      className="relative cursor-pointer flex-shrink-0 auth-course-card"
      style={{ width: '249px', height: '249px', overflow: 'visible' }}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 text-black rounded transition-all duration-300 ease-in-out flex flex-col justify-start aspect-square cursor-pointer auth-course-card-inner hover:scale-[1.015] hover:shadow-xl"
        style={{ backgroundColor: '#F0F0F2', transformOrigin: 'center', zIndex: 1 }}
      >
        <div
          className="flex flex-col h-full auth-course-card-content"
          style={{
            paddingTop: '13px',
            paddingLeft: '13px',
            paddingRight: '13px',
            paddingBottom: '13px',
            backgroundColor: '#F0F0F2',
            borderRadius: 'inherit'
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
              className="text-xs text-black mb-2 auth-course-card-description"
              style={{ lineHeight: '1.4' }}
            >
              {getFirstSentence(course.description)}
            </p>
          )}
          {course.module_names && (
            <div className="pb-8 auth-course-card-modules">
              <p className="text-xs text-black font-semibold mb-1">Modules:</p>
              <ul className="text-xs text-black space-y-0.5">
                {course.module_names.split(', ').slice(0, (course.title || course.name).length > 25 ? 4 : 5).map((moduleName, idx) => (
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [blurredCards, setBlurredCards] = useState<number[]>([])

  const { displayText: typedText, isComplete } = useTypingAnimation(
    'The best courses.\nFor the best students.',
    {
      charDelay: 75,
      startDelay: 1000,
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

  // Detect card visibility for blur effect on course grid
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || courses.length === 0) return

    const updateCardBlur = () => {
      const cards = scrollContainer.querySelectorAll('[data-course-card]')
      const newBlurredCards: number[] = []
      const containerRect = scrollContainer.getBoundingClientRect()
      const containerLeft = containerRect.left
      const isMobile = window.innerWidth < 768
      const viewportWidth = window.innerWidth

      cards.forEach((card, globalIndex) => {
        const cardRect = card.getBoundingClientRect()
        const cardLeft = cardRect.left

        if (isMobile) {
          const halfViewport = viewportWidth / 2
          if (cardLeft > halfViewport) {
            newBlurredCards.push(globalIndex)
          }
        } else {
          const relativeLeft = cardLeft - containerLeft
          if (relativeLeft > 520) {
            newBlurredCards.push(globalIndex)
          }
        }
      })

      setBlurredCards(newBlurredCards)
    }

    updateCardBlur()

    let resizeTimeout: ReturnType<typeof setTimeout>
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateCardBlur, 100)
    }

    scrollContainer.addEventListener('scroll', updateCardBlur)
    window.addEventListener('resize', debouncedResize)

    return () => {
      clearTimeout(resizeTimeout)
      scrollContainer.removeEventListener('scroll', updateCardBlur)
      window.removeEventListener('resize', debouncedResize)
    }
  }, [courses])

  const renderTypedTitle = () => {
    const firstLineLength = 'The best courses.'.length
    const result: React.ReactNode[] = []

    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === '\n') {
        result.push(<br key={`br-${i}`} />)
        continue
      }

      const isSecondLine = i > firstLineLength
      let end = typedText.length
      for (let j = i; j < typedText.length; j++) {
        if (typedText[j] === '\n') {
          end = j
          break
        }
      }

      const chunk = typedText.substring(i, end)
      if (chunk) {
        result.push(
          <span key={`${isSecondLine ? 'pink' : 'black'}-${i}`} style={{ color: isSecondLine ? '#EF0B72' : 'black' }}>
            {chunk}
          </span>
        )
        i = end - 1
      }
    }

    if (!isComplete) {
      result.push(
        <span key="cursor" className="animate-blink font-thin" style={{ color: 'white' }}>|</span>
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
      className="flex items-start justify-center px-10 relative auth-section-3"
      style={{ background: 'white', overflow: 'visible', paddingTop: '3rem', paddingBottom: '3rem' }}
    >
      <div className="w-full text-white">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center auth-section-3-grid">
          {/* Left Column - Description */}
          <div
            className="flex items-center justify-center auth-section-3-left"
            style={{ paddingLeft: '2rem', paddingRight: '1rem' }}
          >
            <div className="flex flex-col items-start">
              <h3
                className="font-bold text-left auth-section-3-title"
                style={{
                  fontSize: '2.5rem',
                  lineHeight: '1.2',
                  minHeight: '6rem',
                  marginBottom: '1rem',
                  color: 'black'
                }}
              >
                {renderTypedTitle()}
              </h3>
              <p
                className="text-lg max-w-2xl text-left auth-section-3-description"
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
                style={{ maxWidth: '119px', height: 'auto', marginTop: '15px' }}
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
              className="overflow-x-auto overflow-y-visible auth-course-cards-scroll hide-scrollbar"
              style={{
                scrollSnapType: 'x mandatory',
                paddingLeft: '30px',
                paddingRight: '315px',
                paddingTop: '30px',
                paddingBottom: '30px',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex gap-3 auth-course-cards-container" style={{ marginRight: '320px' }}>
                {pages.length > 0 ? (
                  pages.map((pageCourses, pageIndex) => (
                    <div
                      key={`page-${pageIndex}`}
                      className="grid grid-cols-2 gap-3 flex-shrink-0 auth-course-cards-grid"
                      style={{
                        width: '510px',
                        minWidth: '510px',
                        maxWidth: '510px',
                        overflow: 'visible'
                      }}
                    >
                      {pageCourses.map((course, localIndex) => {
                        const globalIndex = pageIndex * 4 + localIndex
                        const isBlurred = blurredCards.includes(globalIndex)
                        return (
                          <div
                            key={course.name}
                            data-course-card
                            style={{
                              filter: isBlurred ? 'blur(1px) brightness(0.95)' : 'none',
                              transition: 'filter 200ms ease-out'
                            }}
                          >
                            <CourseCard
                              course={course}
                              onClick={() => setSelectedCourse(course)}
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
                    style={{ width: '510px' }}
                  >
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-[#F0F0F2] rounded aspect-square flex flex-col justify-start overflow-hidden animate-pulse"
                        style={{ padding: '16px', width: '249px', height: '249px' }}
                      >
                        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-300 rounded w-full mb-1" />
                        <div className="h-4 bg-gray-300 rounded w-5/6 mb-1" />
                        <div className="h-4 bg-gray-300 rounded w-4/5 mb-3" />
                      </div>
                    ))}
                  </div>
                )}
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

    {selectedCourse && (
      <CourseModal
        course={selectedCourse}
        coaches={coaches[selectedCourse.name] || []}
        onClose={() => setSelectedCourse(null)}
      />
    )}
  </>
  )
}
