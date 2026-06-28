'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { enrollUserInCourse } from '@/lib/enroll'
import type { Lesson } from '@/types/course'

// Measure text width using Canvas API to dynamically size cards
const getTextWidth = (() => {
  let canvas: HTMLCanvasElement | undefined
  return (text: string, fontSizePx: number, fontWeight: string = 'normal'): number => {
    if (!canvas) canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    ctx.font = `${fontWeight} ${fontSizePx}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    return ctx.measureText(text).width
  }
})()

interface CurriculumLessonSliderProps {
  lessons: Lesson[]
  moduleNumber: number
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}

export default function CurriculumLessonSlider({
  lessons,
  moduleNumber,
  courseSlug,
  courseTitle,
  isComingSoon,
}: CurriculumLessonSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollStartX, setScrollStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [snappedCardIndex, setSnappedCardIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isStarting, setIsStarting] = useState(false)

  // Canvas text-measurement only works in the browser. The ResizeObserver below
  // sets containerWidth only after mount, so `measured` is false during SSR and
  // the first client paint (avoiding a hydration mismatch) and true once mounted.
  const measured = containerWidth > 0

  // Measure container width (for the trailing spacer)
  useEffect(() => {
    if (!scrollContainerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(scrollContainerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const getCardWidth = useCallback((lesson: Lesson): number => {
    // Fallback (also the min width) until the client measures text after mount.
    if (!measured || typeof document === 'undefined') return 416
    // All cards are sized to fit their content plus the start button.
    const titleWidth = getTextWidth(lesson.name, 17.6, '500')
    const bulletPoints = (lesson.bullet_points || []).slice(0, 3)
    const maxBulletWidth = bulletPoints.length > 0
      ? Math.max(...bulletPoints.map(bp => getTextWidth(bp, 14.4) + 16))
      : 0
    const maxContentWidth = Math.max(titleWidth, maxBulletWidth)
    // paddingLeft(1.4rem≈22.4) + gap-3(12) + button(48) + paddingRight(1.5rem≈24) + buffer
    const neededWidth = Math.ceil(maxContentWidth + 122)
    return Math.max(416, neededWidth)
  }, [measured])

  // Drag-to-scroll handlers
  const handleScrollMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    setIsScrolling(true)
    setScrollStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  const handleScrollMouseMove = (e: React.MouseEvent) => {
    if (!isScrolling || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - scrollStartX) * 2
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const handleScrollMouseUp = () => setIsScrolling(false)
  const handleScrollMouseLeave = () => setIsScrolling(false)

  const handleScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current || lessons.length === 0) return
      const scrollPosition = scrollContainerRef.current.scrollLeft
      const gap = 16
      let cumulativeWidth = 0
      let index = 0

      for (let i = 0; i < lessons.length; i++) {
        const cardWidth = getCardWidth(lessons[i])
        if (scrollPosition < cumulativeWidth + cardWidth / 2) {
          index = i
          break
        }
        cumulativeWidth += cardWidth + gap
        if (i === lessons.length - 1) index = i
      }

      setSnappedCardIndex(index)
    })
  }

  // Start a lesson: signed-in → enroll-if-needed + open learning hub;
  // signed-out → sign-in page carrying the target lesson + course.
  const handleStart = async (lessonNumber: number) => {
    if (isStarting) return
    setIsStarting(true)
    const target = `/learning?module=${moduleNumber}&lesson=${lessonNumber}`
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Silently enroll/switch to this course, then open the lesson.
        await enrollUserInCourse({ supabase, userId: user.id, authUser: user, courseSlug, courseTitle, isComingSoon })
        window.location.href = target
      } else {
        window.location.href = `/sign-in?next=${encodeURIComponent(target)}&course=${encodeURIComponent(courseSlug)}`
      }
    } catch (err) {
      console.error('[CurriculumLessonSlider] start failed:', err)
      setIsStarting(false)
    }
  }

  if (lessons.length === 0) return null

  return (
    <div className="relative" style={{ marginTop: '0.75rem' }}>
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          cursor: isScrolling ? 'grabbing' : 'grab',
          scrollSnapType: 'x mandatory',
          scrollSnapStop: 'always',
          scrollPaddingLeft: '0px',
          willChange: 'scroll-position',
        }}
        onMouseDown={handleScrollMouseDown}
        onMouseMove={handleScrollMouseMove}
        onMouseUp={handleScrollMouseUp}
        onMouseLeave={handleScrollMouseLeave}
        onScroll={handleScroll}
      >
        <div className="flex gap-4 items-stretch">
          {lessons.map((lesson, index) => {
            const cardWidth = getCardWidth(lesson)
            const lessonNumber = index + 1

            return (
              <div
                key={`${moduleNumber}-${index}`}
                className="relative flex items-start gap-3"
                style={{
                  width: `${cardWidth}px`,
                  minWidth: `${cardWidth}px`,
                  minHeight: '132px',
                  flexShrink: 0,
                  paddingTop: '1.25rem',
                  paddingRight: '1.5rem',
                  paddingBottom: '0.15rem',
                  paddingLeft: '1.4rem',
                  borderRadius: '0.3rem',
                  background: '#ffffff',
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always',
                }}
              >
                {/* Opacity overlay for non-snapped cards */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'transparent',
                    backdropFilter: 'blur(0.75px)',
                    WebkitBackdropFilter: 'blur(0.75px)',
                    borderRadius: '0.3rem',
                    pointerEvents: 'none',
                    opacity: index !== snappedCardIndex ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out',
                    willChange: 'opacity',
                  }}
                />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <h4 className="text-black" style={{ marginTop: '-4px', marginBottom: '3px', fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0%' }}>
                    {lesson.name}
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {(lesson.bullet_points || []).slice(0, 3).map((bulletPoint, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-black" style={{ fontSize: '0.9rem', fontWeight: 300, letterSpacing: '0%', lineHeight: '1.375' }}>
                        <span className="mt-0.5 text-black">•</span>
                        <span>{bulletPoint}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isComingSoon && (
                  <button
                    type="button"
                    className="bg-[#F6F6F6] text-black font-bold transition-colors flex-shrink-0 group disabled:opacity-70"
                    style={{
                      width: '48px', height: '48px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '0.3rem',
                      position: 'absolute',
                      right: '1.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: isStarting ? 'wait' : 'pointer',
                    }}
                    onClick={() => handleStart(lessonNumber)}
                    disabled={isStarting}
                    aria-label={`Start lesson: ${lesson.name}`}
                  >
                    <svg className="group-hover:stroke-[#EF0B72] transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
          {/* Spacer to allow the last card to scroll fully to the start position */}
          {containerWidth > 0 && (
            <div style={{ width: `${Math.max(0, containerWidth - getCardWidth(lessons[lessons.length - 1]))}px`, flexShrink: 0 }} />
          )}
        </div>
      </div>
    </div>
  )
}
