'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '@/components/Navbar'

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
  const [logoClipPercentage, setLogoClipPercentage] = useState(100)
  const [invertLayers, setInvertLayers] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1200)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  const logoContainerRef = useRef<HTMLDivElement>(null)
  const educationRef = useRef<HTMLDivElement>(null)
  const coursesRef = useRef<HTMLDivElement>(null)
  const learningModelRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const merchRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  const calculateLogoClip = useCallback(() => {
    if (!logoContainerRef.current) return { clipPercent: 100, invertLayers: false }

    const navbarHeight = 73

    // Get logo's actual vertical position in viewport
    const logoRect = logoContainerRef.current.getBoundingClientRect()
    const logoTop = logoRect.top
    const logoBottom = logoRect.bottom
    const logoHeight = logoRect.height

    // Section mapping with background colors
    const sectionBoundaries = [
      { color: 'white', ref: null },               // Hero (default)
      { color: 'black', ref: educationRef },        // Education
      { color: 'white', ref: coursesRef },           // Courses
      { color: 'black', ref: learningModelRef },      // Learning Model
      { color: 'white', ref: testimonialsRef },      // Testimonials
      { color: 'white', ref: merchRef },              // Merchandise
      { color: 'black', ref: faqRef },               // FAQ
      { color: 'black', ref: footerRef }             // Footer
    ]

    let currentSectionColor = 'black' // Default when no sections overlap (navbar first appears over Education)
    let nextSectionColor: string | null = null
    let transitionProgress = 0

    // Find which section(s) the navbar overlaps
    for (let i = 0; i < sectionBoundaries.length; i++) {
      const section = sectionBoundaries[i]
      if (!section.ref?.current) continue

      const rect = section.ref.current.getBoundingClientRect()
      const sectionTop = rect.top
      const sectionBottom = rect.bottom
      const navbarTop = 0
      const navbarBottom = navbarHeight

      // Check if section overlaps navbar in viewport (0-73px range)
      if (sectionBottom > navbarTop && sectionTop < navbarBottom) {
        if (sectionTop <= navbarTop && sectionBottom >= navbarBottom) {
          // Navbar fully within this section
          currentSectionColor = section.color
          nextSectionColor = null
          break
        } else if (sectionTop > navbarTop && sectionTop < navbarBottom) {
          // Section boundary entering from below — transitioning from previous to this
          if (sectionTop >= logoTop && sectionTop <= logoBottom) {
            transitionProgress = (logoBottom - sectionTop) / logoHeight
          } else if (sectionTop < logoTop) {
            transitionProgress = 1
          } else {
            transitionProgress = 0
          }
          if (i > 0 && sectionBoundaries[i - 1].ref) {
            currentSectionColor = sectionBoundaries[i - 1].color
          } else {
            currentSectionColor = 'black'
          }
          nextSectionColor = section.color
          break
        } else if (sectionTop <= navbarTop && sectionBottom < navbarBottom) {
          // Section exiting from top — transitioning from this to next
          if (sectionBottom >= logoTop && sectionBottom <= logoBottom) {
            transitionProgress = 1 - (sectionBottom - logoTop) / logoHeight
          } else if (sectionBottom > logoBottom) {
            transitionProgress = 0
          } else {
            transitionProgress = 1
          }
          currentSectionColor = section.color
          if (i < sectionBoundaries.length - 1) {
            nextSectionColor = sectionBoundaries[i + 1].color
          }
          break
        }
      }
    }

    // Determine if we need to invert layer order (for WHITE→BLACK transitions)
    const shouldInvert = nextSectionColor !== null &&
      currentSectionColor === 'white' &&
      nextSectionColor === 'black'

    // Calculate clip percentage
    let clipPercent: number
    if (nextSectionColor === null) {
      // Fully within one section
      clipPercent = currentSectionColor === 'white' ? 0 : 100
    } else {
      if (currentSectionColor === 'black' && nextSectionColor === 'white') {
        clipPercent = (1 - transitionProgress) * 100
      } else if (currentSectionColor === 'white' && nextSectionColor === 'black') {
        clipPercent = (1 - transitionProgress) * 100
      } else {
        // Same color transition
        clipPercent = currentSectionColor === 'white' ? 0 : 100
      }
    }

    return {
      clipPercent: Math.max(0, Math.min(100, clipPercent)),
      invertLayers: shouldInvert
    }
  }, [])

  // RAF-optimized scroll handler
  useEffect(() => {
    let rafId: number | null = null
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          const { clipPercent, invertLayers } = calculateLogoClip()
          setLogoClipPercentage(clipPercent)
          setInvertLayers(invertLayers)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Calculate initial position
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [calculateLogoClip])

  return (
    <div style={{ overflowX: 'clip' }}>
      {/* Sticky Navbar — transparent, section backgrounds show through */}
      <div className="sticky top-0 z-50">
        <Navbar
          logoClipPercentage={isMobile || isTablet ? 100 : logoClipPercentage}
          invertLayers={isMobile || isTablet ? false : invertLayers}
          logoContainerRef={logoContainerRef}
          variant={isMobile || isTablet ? 'black' : 'default'}
        />
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
