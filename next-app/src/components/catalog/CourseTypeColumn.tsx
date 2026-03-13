'use client'

import { useRef, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import type { AutoAnimationPlugin } from '@formkit/auto-animate'
import CourseCard from './CourseCard'

// Custom auto-animate plugin: override 'add' to fade in-place (no fly-in),
// keep default remove/remain behavior for smooth repositioning
const noFlyIn: AutoAnimationPlugin = (el, action) => {
  if (action === 'add') {
    return new KeyframeEffect(el, [
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: 300, easing: 'ease-out' })
  }
  if (action === 'remove') {
    return new KeyframeEffect(el, [
      { opacity: 1 },
      { opacity: 0 },
    ], { duration: 200, easing: 'ease-in' })
  }
  return new KeyframeEffect(el, [], { duration: 0 })
}

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
}

export default function CourseTypeColumn({
  type,
  courses,
  showDescription = true,
  hideHeader = false,
  cardStaggerBase = 0,
  cardStaggerIncrement = 0.1,
  maxCourses,
}: CourseTypeColumnProps) {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses

  // Disable auto-animate during initial stagger, enable after stagger completes
  const initialRenderRef = useRef(true)
  const useStagger = initialRenderRef.current && cardStaggerBase > 0
  const [animateRef, enableAutoAnimate] = useAutoAnimate(noFlyIn)

  useEffect(() => {
    if (!useStagger) {
      enableAutoAnimate(true)
      return
    }
    // Keep auto-animate off during stagger, enable after longest delay + animation duration
    enableAutoAnimate(false)
    const longestDelay = cardStaggerBase + (displayCourses.length - 1) * cardStaggerIncrement
    const timer = setTimeout(() => {
      initialRenderRef.current = false
      enableAutoAnimate(true)
    }, (longestDelay + 1.5) * 1000)
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
      <div ref={animateRef} className="space-y-3">
        {displayCourses.map((course, idx) => (
          <div
            key={course.id || course.name}
            style={useStagger ? {
              animation: 'fadeInUp 1.5s ease-out forwards',
              animationDelay: `${cardStaggerBase + idx * cardStaggerIncrement}s`,
              opacity: 0,
            } : undefined}
          >
            <CourseCard course={course} />
          </div>
        ))}
      </div>
    </div>
  )
}
