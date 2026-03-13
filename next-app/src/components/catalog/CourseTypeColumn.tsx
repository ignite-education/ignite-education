'use client'

import { useRef, useEffect, useState } from 'react'
import CourseCard from './CourseCard'

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
  courses: Array<{ id?: string; name: string; title?: string }>
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
    }, (longestDelay + 1.5) * 1000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const query = searchQuery.toLowerCase().trim()

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
          const isVisible = !query ||
            course.title?.toLowerCase().includes(query) ||
            course.name?.toLowerCase().includes(query)

          return (
            <div
              key={course.id || course.name}
              style={{
                display: 'grid',
                gridTemplateRows: isVisible ? '1fr' : '0fr',
                opacity: isVisible ? 1 : 0,
                marginBottom: isVisible ? '12px' : '0px',
                transition: transitionsEnabled
                  ? 'grid-template-rows 300ms cubic-bezier(0.33, 1, 0.68, 1), opacity 250ms ease, margin-bottom 300ms cubic-bezier(0.33, 1, 0.68, 1)'
                  : 'none',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={useStagger ? {
                    animation: 'fadeIn 1.5s ease-out forwards',
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
