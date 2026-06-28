'use client'

import { useRef, useEffect, useState } from 'react'
import CourseCard from './CourseCard'
import { courseMatchesQuery } from '@/lib/courseUtils'
import type { Module } from '@/types/course'

export const COURSE_TYPE_CONFIG: Record<string, { title: string; description: string }> = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that\nenable you to enter a new career',
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that\nyou can immediately apply',
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to\nlearn anything you want',
  },
}

interface CourseTypeColumnProps {
  type: string
  courses: Array<{ id?: string; name: string; title?: string; module_structure?: Module[] }>
  showDescription?: boolean
  hideHeader?: boolean
  cardStaggerBase?: number
  cardStaggerIncrement?: number
  maxCourses?: number
  searchQuery?: string
}

export default function CourseTypeColumn({
  type,
  courses,
  showDescription = true,
  hideHeader = false,
  cardStaggerBase = 0,
  cardStaggerIncrement = 0.1,
  maxCourses,
  searchQuery = '',
}: CourseTypeColumnProps) {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses

  // Disable CSS transitions during initial stagger, enable after stagger completes
  const containerRef = useRef<HTMLDivElement>(null)
  const initialRenderRef = useRef(true)
  const useStagger = initialRenderRef.current && cardStaggerBase > 0
  const [transitionsEnabled, setTransitionsEnabled] = useState(false)
  // Start the entrance stagger only once the column scrolls into view, so it's
  // seen even when the catalog sits below the fold (e.g. on the profile page).
  // On pages where it's already in view at load (e.g. /courses) the observer
  // fires immediately, so the behaviour there is unchanged.
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!useStagger) {
      setInView(true)
      setTransitionsEnabled(true)
      return
    }
    const el = containerRef.current
    if (!el) {
      setInView(true)
      return
    }
    // Already in view at mount (e.g. /courses, where the catalog is at the top)?
    // Play immediately. Otherwise wait for it to scroll into view (the profile).
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    if (rect.top < vh && rect.bottom > 0) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!useStagger || !inView) return
    const longestDelay = cardStaggerBase + (displayCourses.length - 1) * cardStaggerIncrement
    const timer = setTimeout(() => {
      initialRenderRef.current = false
      setTransitionsEnabled(true)
    }, (longestDelay + 0.6) * 1000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  return (
    <div ref={containerRef} className={`flex flex-col ${courses.length === 0 ? 'hidden md:flex' : ''}`}>
      <h2
        className={`text-[22px] font-bold text-[#EF0B72] mb-1 text-center tracking-[-0.01em] ${hideHeader ? 'hidden md:block' : ''}`}
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
      >
        {config.title}
      </h2>
      {showDescription && (
        <p
          className={`text-black text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line ${hideHeader ? 'hidden md:block' : ''}`}
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          {config.description}
        </p>
      )}
      <div className="flex flex-col">
        {displayCourses.map((course, idx) => {
          const isVisible = courseMatchesQuery(course, searchQuery)

          return (
            <div
              key={course.id || course.name}
              style={{
                display: 'grid',
                gridTemplateRows: (useStagger || isVisible) ? '1fr' : '0fr',
                opacity: useStagger ? undefined : (isVisible ? 1 : 0),
                marginBottom: (useStagger || isVisible) ? '12px' : '0px',
                transition: transitionsEnabled
                  ? 'grid-template-rows 300ms cubic-bezier(0.33, 1, 0.68, 1), opacity 250ms ease, margin-bottom 300ms cubic-bezier(0.33, 1, 0.68, 1)'
                  : 'none',
              }}
            >
              <div style={{ overflow: useStagger ? 'visible' : 'hidden' }}>
                <div
                  style={useStagger ? {
                    animation: inView ? 'fadeInUpSmall 0.6s ease-out forwards' : 'none',
                    animationDelay: `${cardStaggerBase + idx * cardStaggerIncrement}s`,
                    opacity: 0,
                  } : undefined}
                >
                  <CourseCard course={course} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
