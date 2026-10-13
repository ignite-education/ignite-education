'use client'

import { useState, useEffect, useRef } from 'react'

// Clip for the right column: a centred 648x720 (9:10) crop of the office
// footage, 30fps, no audio, ~0.7 MB. The box it fills is 510px wide to match
// the 2x2 course-card grid in section 3, and roughly square, so object-fit
// cover trims at most ~10% either way. Hosted in the public Supabase `assets`
// bucket like every other welcome-page image — see "Static images on public
// pages" in docs/ARCHITECTURE.md. Upload a replacement with
// scripts/upload-asset.mjs and bump the filename: the bucket serves a one-year
// cache-control, so the same path would keep the old bytes.
const VIDEO_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/welcome-education-portrait-wide.mp4'
const VIDEO_WIDTH = 510
const TICK_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png'
const VIDEO_RADIUS = 16
const CARD_BG = '#1C1C1E'
const CARD_RADIUS = 16
const CARD_GAP = 20
// Desktop only: the three square cards start as a row and collapse into a
// fanned stack as the user scrolls. Card 2 snaps over card 1 once the row's
// top rises above STACK_STEP_1 of the viewport height, card 3 over card 2 at
// STACK_STEP_2, each landing CARD_FAN px to the right of the one beneath so
// the earlier cards still peek out. Both snaps reverse on scrolling back up.
const STACK_STEP_1 = 0.7
const STACK_STEP_2 = 0.55
const CARD_FAN = 28

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip is fetched during
// page load at the browser's lowest priority). Playback starts only once the
// section scrolls into view, runs once, and holds the final frame.

const PROMISES = [
  { title: 'Built by Industry Experts', desc: 'Our courses are built with industry experts to ensure you get the latest area expertise.' },
  { title: 'Ignite is Free', desc: 'All of our courses are free. Always have been and always will be.' },
  { title: 'No Educational Prerequisite', desc: 'You don\u2019t need any experience to study. Our curricula is built for all backgrounds.' },
]

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)
  const cardsRowRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1200)
      setIsWide(window.innerWidth >= 1440)
    }
    update()
    let timeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timeout)
      timeout = setTimeout(update, 100)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Scroll-linked stack (desktop only, where the cards are a row of three).
  // Written straight to the DOM from a RAF-throttled passive scroll listener;
  // the CSS transition on each card does the snapping.
  const isRow = !isMobile && !isTablet
  useEffect(() => {
    const row = cardsRowRef.current
    const cards = cardRefs.current
    if (!row) return
    const reset = () => cards.forEach((c) => { if (c) c.style.transform = 'none' })
    if (!isRow || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reset()
      return
    }

    let rafId: number | null = null
    let stage = -1
    const update = () => {
      rafId = null
      const vh = window.innerHeight
      const top = row.getBoundingClientRect().top
      const next = top < vh * STACK_STEP_2 ? 2 : top < vh * STACK_STEP_1 ? 1 : 0
      if (next === stage) return
      stage = next
      const cardWidth = (row.clientWidth - 2 * CARD_GAP) / 3
      cards.forEach((card, i) => {
        if (!card || i === 0) return
        // Slide left over the previous cards, leaving CARD_FAN px of each visible.
        const dx = stage >= i ? -i * (cardWidth + CARD_GAP) + i * CARD_FAN : 0
        card.style.transform = dx ? `translate3d(${dx.toFixed(1)}px, 0, 0)` : 'none'
      })
    }
    const schedule = () => {
      if (rafId === null) rafId = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [isRow])

  // One-shot observer: start playback once ~30% of the video is on screen,
  // then disconnect so the clip plays exactly once per page view.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    // Leave the first frame as a still for these users.
    if (reducedMotion || saveData) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldPlay(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldPlay) return
    const video = videoRef.current
    if (!video) return
    // Autoplay policies require muted + playsInline; set muted on the element
    // too, since React does not emit the attribute in server-rendered HTML.
    video.muted = true
    video.play().catch(() => {
      // Blocked (e.g. iOS low-power mode): the first frame stays as a still.
    })
  }, [shouldPlay])

  // Render the heading with pink highlighted words and explicit line breaks
  const renderHeading = () => {
    // Desktop line breaks (md+)
    const desktopLines = [
      { text: 'Education should be ', highlights: [] as string[] },
      { text: 'accessible, personalised ', highlights: ['accessible', 'personalised'] },
      { text: 'and integrated for everyone', highlights: ['integrated'] }
    ]

    // Mobile line breaks
    const mobileLines = [
      { text: 'Education should', highlights: [] as string[] },
      { text: 'be accessible,', highlights: ['accessible,'] },
      { text: 'personalised and', highlights: ['personalised'] },
      { text: 'integrated for', highlights: ['integrated'] },
      { text: 'everyone', highlights: [] as string[] }
    ]

    const renderLines = (lines: typeof desktopLines) => {
      return lines.map((line, lineIdx) => {
        const result: React.ReactNode[] = []
        let remaining = line.text

        for (const word of line.highlights) {
          const start = remaining.indexOf(word)
          if (start > 0) {
            result.push(<span key={`${lineIdx}-pre-${word}`}>{remaining.slice(0, start)}</span>)
          }
          // Strip trailing comma/punctuation from highlight class, keep it in text
          const cleanWord = word.replace(/[,.]$/, '')
          const trailingPunct = word.slice(cleanWord.length)
          result.push(
            <span key={`${lineIdx}-${word}`}><span className="text-[#EF0B72]">{cleanWord}</span>{trailingPunct}</span>
          )
          remaining = remaining.slice(start + word.length)
        }

        if (remaining) {
          result.push(<span key={`${lineIdx}-end`}>{remaining}</span>)
        }

        return (
          <span key={lineIdx}>
            {lineIdx > 0 && <br />}
            {result}
          </span>
        )
      })
    }

    return (
      <>
        <span className="hidden md:inline">{renderLines(desktopLines)}</span>
        <span className="md:hidden">{renderLines(mobileLines)}</span>
      </>
    )
  }

  const video = (
    <video
      ref={videoRef}
      src={VIDEO_URL}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      // No `loop` and no poster: the browser holds the last decoded frame
      // after `ended`. pause() is only a guard against a stray replay.
      onEnded={(e) => e.currentTarget.pause()}
      style={{
        display: 'block',
        // Desktop: a fixed-width, roughly square box. Mobile: full width at
        // the clip's own aspect.
        width: isMobile ? '100%' : isTablet ? 300 : isWide ? VIDEO_WIDTH : 440,
        height: isMobile ? 'auto' : isTablet ? 'min(55vh, 440px)' : 'min(62vh, 600px)',
        aspectRatio: isMobile ? '648 / 720' : undefined,
        maxWidth: '100%',
        objectFit: 'cover',
        borderRadius: VIDEO_RADIUS,
        background: '#111',
        pointerEvents: 'none',
      }}
    />
  )

  return (
    <section
      ref={sectionRef}
      className="relative auth-section-2"
      style={{
        background: 'black',
        paddingTop: isMobile ? '6rem' : '6vh',
        paddingBottom: isMobile ? '4rem' : '6vh',
        // Section 3's heading sits at the left of a centred 72rem block (gutter
        // px-8 md:px-10) plus a 2rem inset. Reproduce that exact left edge here
        // so the two headings line up, while the content runs to the right
        // gutter so the 510px video and the three cards have room.
        paddingLeft: isMobile ? '2rem' : 'calc(max((100% - 72rem) / 2, 2.5rem) + 2rem)',
        paddingRight: isMobile ? '2rem' : '2.5rem',
        overflow: 'hidden',
      }}
    >
      <div
        className="w-full text-white"
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: 'column',
          gridTemplateColumns: isMobile ? undefined : 'minmax(0, 1fr) auto',
          alignItems: isMobile ? 'stretch' : 'center',
          columnGap: isTablet ? '2.5rem' : '3.5rem',
          rowGap: '3rem',
        }}
      >
        {/* Left column: heading + promise cards */}
        <div style={{ minWidth: 0 }}>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <span style={{ display: 'inline', whiteSpace: 'normal' }}>
              {renderHeading()}
            </span>
          </h2>

          {/* Promises: three square grey cards. On desktop they start as a row
              and collapse into a fanned stack on scroll (see the effect above). */}
          <div
            ref={cardsRowRef}
            className="auth-promises-list text-white"
            style={{
              display: 'grid',
              gridTemplateColumns: isRow ? 'repeat(3, minmax(0, 1fr))' : '1fr',
              gap: isRow ? CARD_GAP : 16,
              marginTop: isMobile ? '2.5rem' : '3rem',
            }}
          >
            {PROMISES.map((promise, idx) => (
              <div
                key={idx}
                ref={(el) => { cardRefs.current[idx] = el }}
                data-promise-idx={idx}
                style={{
                  position: 'relative',
                  zIndex: idx + 1,
                  aspectRatio: isRow ? '1 / 1' : undefined,
                  background: CARD_BG,
                  borderRadius: CARD_RADIUS,
                  padding: isRow ? '1.25rem' : '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'transform 550ms cubic-bezier(0.22, 1, 0.36, 1)',
                  willChange: isRow ? 'transform' : undefined,
                  boxShadow: isRow ? '0 12px 32px rgba(0, 0, 0, 0.45)' : undefined,
                }}
              >
                <img
                  src={TICK_URL}
                  alt=""
                  width={32}
                  height={32}
                  style={{ width: isRow ? '30px' : '36px', height: isRow ? '30px' : '36px' }}
                />
                <div>
                  <div className="font-semibold text-white" style={{ fontSize: isRow ? '15px' : '20px', lineHeight: 1.25, marginBottom: '0.4rem' }}>
                    {promise.title}
                  </div>
                  <div className="text-white font-normal" style={{ fontSize: isRow ? '12.5px' : '16px', lineHeight: 1.4, opacity: 0.85 }}>
                    {promise.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: portrait video (below the text on mobile). Sits above
            the card row so the cards slide in from behind it. */}
        <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', position: 'relative', zIndex: 1 }}>
          {video}
        </div>
      </div>

    </section>
  )
}
