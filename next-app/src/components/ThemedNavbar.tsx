'use client'

import { useCallback, useEffect, useState } from 'react'
import Navbar from './Navbar'

// Sticky navbar that swaps between its light and dark look to match whatever
// section is beneath it, the same behaviour as the /welcome page bar. Instead
// of threading refs through the page, it reads `data-nav-theme="black|white"`
// markers off the DOM, so a server-rendered page can use it by tagging its
// sections. The bar is 65px tall (see Navbar): the section whose box contains
// the bar's bottom edge decides the theme, so the bar swaps the moment a
// section's top edge touches it.
const NAVBAR_HEIGHT = 65

type Theme = 'white' | 'black'

interface ThemedNavbarProps {
  /** Theme before the first measurement, matching the section at the top of the page. */
  initialTheme?: Theme
}

export default function ThemedNavbar({ initialTheme = 'black' }: ThemedNavbarProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  const themeUnderNavbar = useCallback((): Theme | null => {
    const sections = document.querySelectorAll<HTMLElement>('[data-nav-theme]')
    const y = NAVBAR_HEIGHT
    // Fall back to the nearest tagged section above the bar, so an untagged
    // gap between sections keeps the previous section's colour.
    let above: Theme | null = null
    for (const el of sections) {
      const rect = el.getBoundingClientRect()
      const t = el.dataset.navTheme === 'white' ? 'white' : 'black'
      if (rect.top <= y && rect.bottom > y) return t
      if (rect.top <= y) above = t
    }
    return above
  }, [])

  // RAF-throttled scroll handler
  useEffect(() => {
    let rafId: number | null = null
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          const next = themeUnderNavbar()
          if (next) setTheme(next)
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
    <div className="sticky top-0 z-50">
      <Navbar theme={theme} />
    </div>
  )
}
