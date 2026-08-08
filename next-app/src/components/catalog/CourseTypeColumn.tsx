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
  /** Forwarded to every CourseCard — see its prop docs. */
  openInNewTab?: boolean
  /**
   * Milliseconds for a card to collapse in or out as the query filters it.
   * Opacity runs at 5/6 of this, so a card finishes fading before it finishes
   * flattening and no squashed sliver of text shows at the end.
   *
   * Opt-in rather than a blanket change: this component also backs /courses and
   * the public profile pages via CourseCatalogClient, and only /welcome is meant
   * to run slower.
   */
  filterMs?: number
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
  openInNewTab = false,
  filterMs = 300,
}: CourseTypeColumnProps) {
  const filterOpacityMs = Math.round((filterMs * 5) / 6)
  const filterEase = 'cubic-bezier(0.33, 1, 0.68, 1)'
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses

  // Disable CSS transitions during initial stagger, enable after stagger completes
  const initialRenderRef = useRef(true)
  const useStagger = initialRenderRef.current && cardStaggerBase > 0
  const [transitionsEnabled, setTransitionsEnabled] = useState(false)

  useEffect(() => {
    if (!useStagger) {
      setTransitionsEnabled(true)
      return
    }
    const longestDelay = cardStaggerBase + (displayCourses.length - 1) * cardStaggerIncrement
    const timer = setTimeout(() => {
      initialRenderRef.current = false
      setTransitionsEnabled(true)
    }, (longestDelay + 0.6) * 1000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`flex flex-col ${courses.length === 0 ? 'hidden md:flex' : ''}`}>
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
                  ? `grid-template-rows ${filterMs}ms ${filterEase}, opacity ${filterOpacityMs}ms ease, margin-bottom ${filterMs}ms ${filterEase}`
                  : 'none',
              }}
            >
              <div style={{ overflow: useStagger ? 'visible' : 'hidden' }}>
                <div
                  style={useStagger ? {
                    animation: 'fadeInUpSmall 0.6s ease-out forwards',
                    animationDelay: `${cardStaggerBase + idx * cardStaggerIncrement}s`,
                    opacity: 0,
                  } : undefined}
                >
                  <CourseCard course={course} openInNewTab={openInNewTab} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
