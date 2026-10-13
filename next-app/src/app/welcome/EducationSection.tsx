'use client'

import { useState, useEffect, useRef } from 'react'

// Portrait clip for the right column: a centred 9:16 crop of the office
// footage (404x720, 30fps, no audio, ~1 MB). Hosted in the public Supabase
// `assets` bucket like every other welcome-page image — see "Static images on
// public pages" in docs/ARCHITECTURE.md. Upload a replacement with
// scripts/upload-asset.mjs and bump the filename: the bucket serves a one-year
// cache-control, so the same path would keep the old bytes.
const VIDEO_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/welcome-education-portrait-crop.mp4'
const TICK_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png'
const VIDEO_RADIUS = 16
const CARD_BG = '#1C1C1E'
const CARD_RADIUS = 16
// The card row starts this far to the right (as a fraction of the viewport
// width) when it enters at the bottom of the screen, and settles into place
// by the time its top reaches CARDS_SETTLE_AT of the viewport height.
const CARDS_OFFSET_VW = 0.3
const CARDS_SETTLE_AT = 0.45

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip is fetched during
// page load at the browser's lowest priority). Playback starts only once the
// section scrolls into view, runs once, and holds the final frame.

const PROMISES = [
  { title: 'Built by Industry Experts', desc: <>Our courses are built with<br />industry experts to ensure you<br />get the latest area expertise.</> },
  { title: 'Ignite is Free', desc: <>All of our courses are<br />free. Always have been<br />and always will be.</> },
  { title: 'No Educational Prerequisite', desc: <>You don&apos;t need any experience<br />to study. Our curricula is built<br />for all backgrounds.</> },
]

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)
  const cardsRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1200)
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

  // Scroll-linked slide: the card row sits off to the right while it is below
  // the fold and glides left into place as the user scrolls it up the screen
  // (and back out if they scroll up). Written straight to the DOM from a
  // RAF-throttled passive scroll listener, so no React re-render per frame.
  useEffect(() => {
    const row = cardsRowRef.current
    if (!row) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      row.style.transform = 'none'
      row.style.opacity = '1'
      return
    }

    let rafId: number | null = null
    const update = () => {
      rafId = null
      const vh = window.innerHeight
      const top = row.getBoundingClientRect().top
      const start = vh
      const end = vh * CARDS_SETTLE_AT
      const raw = (start - top) / (start - end)
      const p = Math.min(1, Math.max(0, raw))
      const eased = 1 - Math.pow(1 - p, 3)
      const offset = (1 - eased) * window.innerWidth * CARDS_OFFSET_VW
      row.style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`
      row.style.opacity = (0.3 + 0.7 * eased).toFixed(3)
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
  }, [])

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
        aspectRatio: '9 / 16',
        // Portrait: height leads, width follows from the aspect ratio.
        height: isMobile ? 'min(70vh, 520px)' : 'min(62vh, 600px)',
        width: 'auto',
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
        maxWidth: '1500px',
        margin: '0 auto',
        paddingTop: isMobile ? '7rem' : '10vh',
        paddingBottom: isMobile ? '5rem' : '10vh',
        paddingLeft: isMobile ? '2rem' : isTablet ? '2.5rem' : '40px',
        paddingRight: isMobile ? '2rem' : isTablet ? '2.5rem' : '40px',
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
          columnGap: isTablet ? '3rem' : '5rem',
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

          {/* Promises: a row of three grey cards that slides in from the right on scroll */}
          <div
            ref={cardsRowRef}
            className="auth-promises-list text-white"
            style={{
              display: 'grid',
              // Three across only where the left column is wide enough.
              gridTemplateColumns: isMobile || isTablet ? '1fr' : 'repeat(3, minmax(0, 1fr))',
              gap: isMobile ? '1rem' : '1.5rem',
              marginTop: isMobile ? '2.5rem' : '3rem',
              // Server-rendered already offset, so there is no jump when the
              // scroll listener takes over on hydration.
              transform: `translate3d(${CARDS_OFFSET_VW * 100}vw, 0, 0)`,
              opacity: 0.3,
              willChange: 'transform, opacity',
            }}
          >
            {PROMISES.map((promise, idx) => (
              <div
                key={idx}
                data-promise-idx={idx}
                style={{
                  background: CARD_BG,
                  borderRadius: CARD_RADIUS,
                  padding: isMobile ? '1.75rem' : '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '1.25rem',
                }}
              >
                <img
                  src={TICK_URL}
                  alt=""
                  width={42}
                  height={42}
                  style={{ width: '42px', height: '42px' }}
                />
                <div>
                  <div className="text-xl font-semibold text-white mb-2">
                    {promise.title}
                  </div>
                  <div className="text-base text-white font-normal" style={{ opacity: 0.85 }}>
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
