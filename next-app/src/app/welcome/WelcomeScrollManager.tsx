'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '@/components/Navbar'

// The bar is 65px tall (see Navbar). The section whose box contains the bar's
// bottom edge decides the theme, so the bar swaps the moment a section's top
// edge touches it — the same trigger harvey.ai uses.
const NAVBAR_HEIGHT = 65

type Theme = 'white' | 'black'

interface WelcomeScrollManagerProps {
  educationSection: React.ReactNode
  coursesSection: React.ReactNode
  learningModelSection: React.ReactNode
  testimonialsSection: React.ReactNode
  merchSection: React.ReactNode
  faqSection: React.ReactNode
  footer: React.ReactNode
}

export default function WelcomeScrollManager({
  educationSection,
  coursesSection,
  learningModelSection,
  testimonialsSection,
  merchSection,
  faqSection,
  footer
}: WelcomeScrollManagerProps) {
  // Education, the first section under the bar, is black.
  const [theme, setTheme] = useState<Theme>('black')

  // Preserve scroll position across tab switches (Supabase auth refresh + HMR can reset it)
  const savedScrollRef = useRef(0)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        savedScrollRef.current = window.scrollY
      } else {
        const saved = savedScrollRef.current
        if (saved > 0) {
          requestAnimationFrame(() => window.scrollTo(0, saved))
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const educationRef = useRef<HTMLDivElement>(null)
  const coursesRef = useRef<HTMLDivElement>(null)
  const learningModelRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const merchRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  const sectionThemes = useRef<Array<{ theme: Theme; ref: React.RefObject<HTMLDivElement | null> }>>([
    { theme: 'black', ref: educationRef },
    { theme: 'white', ref: coursesRef },
    { theme: 'black', ref: learningModelRef },
    { theme: 'white', ref: testimonialsRef },
    { theme: 'white', ref: merchRef },
    { theme: 'black', ref: faqRef },
    { theme: 'black', ref: footerRef },
  ])

  const themeUnderNavbar = useCallback((): Theme => {
    const y = NAVBAR_HEIGHT
    for (const section of sectionThemes.current) {
      const el = section.ref.current
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top <= y && rect.bottom > y) return section.theme
    }
    return 'black'
  }, [])

  // RAF-throttled scroll handler
  useEffect(() => {
    let rafId: number | null = null
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          setTheme(themeUnderNavbar())
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [themeUnderNavbar])

  return (
    <div style={{ overflowX: 'clip' }}>
      {/* Sticky Navbar — tinted and blurred to match the section beneath it,
          swapping light/dark as sections scroll past. */}
      <div className="sticky top-0 z-50">
        <Navbar theme={theme} />
      </div>

      {/* Sections with refs for scroll detection */}
      <div ref={educationRef}>
        {educationSection}
      </div>
      <div ref={coursesRef}>
        {coursesSection}
      </div>
      <div ref={learningModelRef}>
        {learningModelSection}
      </div>
      <div ref={testimonialsRef}>
        {testimonialsSection}
      </div>
      <div ref={merchRef}>
        {merchSection}
      </div>
      <div ref={faqRef}>
        {faqSection}
      </div>
      <div ref={footerRef}>
        {footer}
      </div>
    </div>
  )
}
