'use client'

import { useState, useEffect, useRef } from 'react'

// Clip for the right column: the office footage as cropped in iMovie
// (1250x1080 export), scaled to 1042x900 / CRF 23, 30fps, no audio (~1.8 MB).
// No further crop is applied at encode time; the clip is wider than the
// desktop panel, so object-fit cover trims the sides and keeps the centre.
// Hosted in the public Supabase `assets`
// bucket like every other welcome-page image — see "Static images on public
// pages" in docs/ARCHITECTURE.md. Upload a replacement with
// scripts/upload-asset.mjs and bump the filename: the bucket serves a one-year
// cache-control, so the same path would keep the old bytes.
const VIDEO_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/welcome-education-portrait-wide-v4.mp4'
// Panel width on wide desktops; 10% under the column it sits in so the clip
// floats inside the section rather than filling it edge to edge.
const VIDEO_WIDTH = 459
const VIDEO_WIDTH_NARROW = 396
// Vertical padding of the section on desktop; the video panel is inset by
// the same amount top and bottom.
const SECTION_PAD_Y = '4vh'
const TICK_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png'
const VIDEO_RADIUS = 10
// Cards take their look from the course cards in section 3 (#F6F6F6, black
// text, 0.85rem body) but are a touch smaller with a larger 20px title.
const CARD_BG = '#F6F6F6'
const CARD_RADIUS = 16
const CARD_GAP = 20
const CARD_SIZE = 212
// Desktop only: the row of three fixed-size cards can be wider than the left
// column, in which case its tail runs under the video. As the row scrolls up
// the viewport it shifts left by exactly that overflow, settling once its top
// reaches ROW_SETTLE_AT of the viewport height, so every card ends up clear
// of the video. A row that fits does not move.
const ROW_SETTLE_AT = 0.3

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip is fetched during
// page load at the browser's lowest priority). Playback starts only once the
// section scrolls into view, then loops.

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
  const leftColRef = useRef<HTMLDivElement>(null)
  const cardsRowRef = useRef<HTMLDivElement>(null)

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

  // Scroll-linked shift for an overflowing row (desktop only). Written
  // straight to the DOM from a RAF-throttled passive scroll listener.
  const isRow = !isMobile && !isTablet
  useEffect(() => {
    const row = cardsRowRef.current
    const col = leftColRef.current
    if (!row || !col) return
    if (!isRow || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      row.style.transform = 'none'
      return
    }

    let rafId: number | null = null
    const update = () => {
      rafId = null
      const overflow = Math.max(0, row.scrollWidth - col.clientWidth)
      if (overflow === 0) {
        row.style.transform = 'none'
        return
      }
      const vh = window.innerHeight
      const top = row.getBoundingClientRect().top
      const raw = (vh - top) / (vh - vh * ROW_SETTLE_AT)
      const p = Math.min(1, Math.max(0, raw))
      const eased = 1 - Math.pow(1 - p, 2)
      row.style.transform = `translate3d(${(-eased * overflow).toFixed(1)}px, 0, 0)`
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
      loop
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      style={isRow ? {
        // Desktop: a box against the right gutter, 90% of the section's
        // content height and centred vertically within it.
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        right: '2.5rem',
        width: isWide ? VIDEO_WIDTH : VIDEO_WIDTH_NARROW,
        // Explicit: a replaced element needs a height to be cropped by cover.
        height: `calc(0.9 * (100% - 2 * ${SECTION_PAD_Y}))`,
        objectFit: 'cover',
        borderRadius: VIDEO_RADIUS,
        background: '#111',
        pointerEvents: 'none',
        zIndex: 1,
      } : {
        display: 'block',
        // Tablet: a fixed box beside the text. Mobile: 90% width, centred,
        // at the clip's own aspect.
        width: isMobile ? '90%' : 270,
        height: isMobile ? 'auto' : 'min(49.5vh, 396px)',
        margin: isMobile ? '0 auto' : undefined,
        aspectRatio: isMobile ? '1042 / 900' : undefined,
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
        paddingTop: isMobile ? '6rem' : SECTION_PAD_Y,
        paddingBottom: isMobile ? '4rem' : SECTION_PAD_Y,
        // Section height on desktop (content is centred inside it).
        minHeight: isRow ? `calc(min(78vh, 740px) + 2 * ${SECTION_PAD_Y})` : undefined,
        display: isRow ? 'flex' : undefined,
        flexDirection: isRow ? 'column' : undefined,
        justifyContent: isRow ? 'center' : undefined,
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
        <div ref={leftColRef} style={{ minWidth: 0 }}>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <span style={{ display: 'inline', whiteSpace: 'normal' }}>
              {renderHeading()}
            </span>
          </h2>

          {/* Promises: three square cards in the course-card style. On desktop
              the row is fixed-size and may overflow under the video; the
              effect above shifts it left on scroll (see ROW_SETTLE_AT). */}
          <div
            ref={cardsRowRef}
            className="auth-promises-list"
            style={{
              display: isRow ? 'flex' : 'grid',
              gridTemplateColumns: isRow ? undefined : '1fr',
              gap: isRow ? CARD_GAP : 16,
              width: isRow ? 'max-content' : undefined,
              marginTop: isMobile ? '3rem' : '4rem',
              willChange: isRow ? 'transform' : undefined,
            }}
          >
            {PROMISES.map((promise, idx) => (
              <div
                key={idx}
                data-promise-idx={idx}
                style={{
                  width: isRow ? CARD_SIZE : undefined,
                  height: isRow ? CARD_SIZE : undefined,
                  flexShrink: 0,
                  background: CARD_BG,
                  color: 'black',
                  borderRadius: CARD_RADIUS,
                  padding: isRow ? '16px' : '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <img
                  src={TICK_URL}
                  alt=""
                  width={32}
                  height={32}
                  style={{ width: isRow ? '28px' : '32px', height: isRow ? '28px' : '32px' }}
                />
                <div>
                  <div className="font-semibold" style={{ fontSize: '20px', lineHeight: '25px', marginBottom: '6px' }}>
                    {promise.title}
                  </div>
                  <div style={{ fontSize: isRow ? '0.8rem' : '0.85rem', lineHeight: 1.35 }}>
                    {promise.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column. On desktop this only reserves the video's width: the
            panel itself is absolutely positioned on the section so it can run
            the full height, and it paints above the card row so the cards
            slide out from behind it. */}
        {isRow ? (
          <div style={{ width: isWide ? VIDEO_WIDTH : VIDEO_WIDTH_NARROW }} aria-hidden="true" />
        ) : (
          <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', position: 'relative', zIndex: 1 }}>
            {video}
          </div>
        )}
      </div>
      {isRow && video}
    </section>
  )
}
