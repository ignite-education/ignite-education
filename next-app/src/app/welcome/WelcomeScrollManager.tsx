'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '@/components/Navbar'

// The sticky navbar's background. It follows the colour of the section
// scrolling beneath it (and the boundary between two sections, pixel for
// pixel), so this is just how opaque that tint is: 1 would be a solid bar,
// 0 the old fully transparent one.
const NAV_BG_ALPHA = 0.85
const navTint = (color: string) =>
  color === 'white' ? `rgba(255, 255, 255, ${NAV_BG_ALPHA})` : `rgba(0, 0, 0, ${NAV_BG_ALPHA})`
// 1px grey line along the bottom edge. A translucent mid-grey so it shows on
// both the black and white sections; drawn as an inset shadow rather than a
// border so the bar stays exactly 65px tall.
const NAV_BOTTOM_LINE = 'inset 0 -1px 0 rgba(128, 128, 128, 0.35)'
// Backdrop blur on the bar, so the section edge scrolling beneath it (and the
// content) is softened rather than showing as a hard line through the tint.
const NAV_BACKDROP_BLUR = 'blur(12px)'
// How far (px) either side of the section boundary the tint fades from one
// colour to the other, instead of switching at a hard stop.
const NAV_SPLIT_FEATHER = 24

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
  const [navBackground, setNavBackground] = useState(navTint('black'))
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
    if (!logoContainerRef.current) return { clipPercent: 100, invertLayers: false, navBackground: navTint('black') }

    const navbarHeight = 65

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
    // Where the boundary between the two sections currently sits, in px from
    // the top of the navbar — drives the background tint, which (unlike the
    // logo clip) tracks it across the navbar's full height.
    let boundaryY: number | null = null

    // Find which section(s) the navbar overlaps
    for (let i = 0; i < sectionBoundaries.length; i++) {
      const section = sectionBoundaries[i]
      if (!section.ref?.current) continue

      const rect = section.ref.current.getBoundingClientRect()
      const sectionTop = rect.top
      const sectionBottom = rect.bottom
      const navbarTop = 0
      const navbarBottom = navbarHeight

      // Check if section overlaps navbar in viewport (0-65px range)
      if (sectionBottom > navbarTop && sectionTop < navbarBottom) {
        if (sectionTop <= navbarTop && sectionBottom >= navbarBottom) {
          // Navbar fully within this section
          currentSectionColor = section.color
          nextSectionColor = null
          break
        } else if (sectionTop > navbarTop && sectionTop < navbarBottom) {
          // Section boundary entering from below — transitioning from previous to this
          boundaryY = sectionTop
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
          boundaryY = sectionBottom
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

    // Background tint: the colour of the section beneath, fading from one
    // colour to the other around the section boundary while one is crossing
    // the navbar.
    const navBackground =
      nextSectionColor === null || nextSectionColor === currentSectionColor || boundaryY === null
        ? navTint(currentSectionColor)
        : `linear-gradient(to bottom, ${navTint(currentSectionColor)} ${boundaryY - NAV_SPLIT_FEATHER}px, ${navTint(nextSectionColor)} ${boundaryY + NAV_SPLIT_FEATHER}px)`

    return {
      clipPercent: Math.max(0, Math.min(100, clipPercent)),
      invertLayers: shouldInvert,
      navBackground
    }
  }, [])

  // RAF-optimized scroll handler
  useEffect(() => {
    let rafId: number | null = null
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          const { clipPercent, invertLayers, navBackground } = calculateLogoClip()
          setLogoClipPercentage(clipPercent)
          setInvertLayers(invertLayers)
          setNavBackground(navBackground)
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
      {/* Sticky Navbar — slightly translucent. On desktop the tint follows the
          section beneath it; on mobile/tablet it's a plain black bar (the
          Navbar's own `black` variant is solid, so the tint lives here). */}
      <div
        className="sticky top-0 z-50"
        style={{
          background: isMobile || isTablet ? navTint('black') : navBackground,
          boxShadow: NAV_BOTTOM_LINE,
          backdropFilter: NAV_BACKDROP_BLUR,
          WebkitBackdropFilter: NAV_BACKDROP_BLUR,
        }}
      >
        <Navbar
          logoClipPercentage={isMobile || isTablet ? 100 : logoClipPercentage}
          invertLayers={isMobile || isTablet ? false : invertLayers}
          logoContainerRef={logoContainerRef}
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
