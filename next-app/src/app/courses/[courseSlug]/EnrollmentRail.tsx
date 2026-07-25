'use client'

import { useEffect, useRef, useState } from 'react'
import EnrollmentCTA from './EnrollmentCTA'

/**
 * How far past a button's edges --clip-split is allowed to travel. Must exceed
 * the glow blur radii in globals.css (currently 15-17px) so a button wholly
 * inside one band is not clipped mid-glow.
 */
const GLOW_MARGIN = 28

interface EnrollmentRailProps {
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}

/**
 * Desktop enrollment rail.
 *
 * Two jobs, both needing measurement rather than static CSS:
 *  1. At rest the top of its first button lines up with the top of the course
 *     title. Its sticky containing block spans hero + curriculum (so it can
 *     stay stuck that far) rather than being a sibling of the title, so the
 *     resting offset has to be measured rather than expressed as alignment.
 *  2. Its contents are light over the black band and dark over the grey one,
 *     changing mid-element rather than snapping. Text uses --rail-split
 *     (viewport px) with .rail-clip-text, which clips a viewport-anchored
 *     gradient to the glyphs. Anything that cannot do that — the button glows,
 *     the SVG share icon — opts in with data-clip-split and gets a
 *     per-element --clip-split instead, since clip-path is element-relative.
 */
export default function EnrollmentRail({ courseSlug, courseTitle, isComingSoon }: EnrollmentRailProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [padTop, setPadTop] = useState<number | null>(null)

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-course-hero]')
    const box = boxRef.current
    if (!hero || !box) return

    // Resting position: first button's top edge level with the title's top.
    // Rects are read in the same frame, so scroll position cancels out.
    const alignToTitle = () => {
      const title = document.querySelector<HTMLElement>('[data-course-title]')
      if (!title) return
      // Scoped to the enrollment slot: an unscoped 'button' lookup matches a
      // ShareButtons button while auth is still resolving, which would push the
      // whole rail up by the slot's height. Absent until auth resolves, in
      // which case the slot's own top is where the button will land.
      const button = box.querySelector<HTMLElement>('[data-cta-slot] button')
      const buttonInset = button
        ? button.getBoundingClientRect().top - box.getBoundingClientRect().top
        : 0
      const offset = title.getBoundingClientRect().top - hero.getBoundingClientRect().top - buttonInset
      setPadTop(Math.max(0, Math.round(offset)))
    }

    // Where the black band ends, in viewport coordinates. Written straight to
    // the DOM rather than through state so scrolling never triggers a render.
    const paint = () => {
      const boundary = hero.getBoundingClientRect().bottom
      box.style.setProperty('--rail-split', `${boundary}px`)

      // clip-path insets are element-relative rather than viewport-relative, so
      // --rail-split cannot drive them: every opted-in element needs the
      // boundary expressed against its own top edge. Clamped generously past
      // both edges so an element sitting wholly in one band is not clipped
      // mid-glow — the margin only has to exceed the blur radii in globals.css.
      for (const el of box.querySelectorAll<HTMLElement>('[data-clip-split]')) {
        const rect = el.getBoundingClientRect()
        const split = Math.max(-GLOW_MARGIN, Math.min(rect.height + GLOW_MARGIN, boundary - rect.top))
        el.style.setProperty('--clip-split', `${split}px`)
      }
    }

    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        paint()
      })
    }

    alignToTitle()
    paint()

    // The CTA changes height when auth resolves; the hero reflows on resize.
    const ro = new ResizeObserver(() => {
      alignToTitle()
      paint()
    })
    ro.observe(hero)
    ro.observe(box)

    // The CTA reserves a fixed height, so auth resolving swaps its contents
    // without changing size and the ResizeObserver above stays silent. Watch
    // for that swap directly: until the buttons exist there is nothing to
    // measure or to write --clip-split onto.
    const mo = new MutationObserver(() => {
      alignToTitle()
      paint()
    })
    mo.observe(box, { childList: true, subtree: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="flex-shrink-0" style={{ width: '315px', paddingTop: padTop ?? 130 }}>
      <div ref={boxRef} className="sticky top-24 pointer-events-auto">
        <EnrollmentCTA
          courseSlug={courseSlug}
          courseTitle={courseTitle}
          isComingSoon={isComingSoon}
          clipText
        />
      </div>
    </div>
  )
}
