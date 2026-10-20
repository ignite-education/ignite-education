'use client'

import { useState, useEffect, useRef } from 'react'
import useTypingAnimation from '@/hooks/useTypingAnimation'

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
// Panel width on wide desktops; ~80% of the column it sits in so the clip
// floats inside the section rather than filling it edge to edge.
const VIDEO_WIDTH = 380
const VIDEO_WIDTH_NARROW = 328
// Vertical padding of the section on desktop; the video panel is inset by
// the same amount top and bottom.
const SECTION_PAD_Y = '4vh'
// Height of the section's content box on desktop. The video panel takes
// VIDEO_H of it, centred, and the text column is padded down by the same
// offset so the heading's top lines up with the video's top.
const CONTENT_H = 'min(78vh, 740px)'
const VIDEO_H = 0.88
const VIDEO_TOP_OFFSET = `calc(${(1 - VIDEO_H) / 2} * ${CONTENT_H})`
// Gutter between the section's left edge and the video (tablet and desktop).
const VIDEO_GUTTER_LEFT = '4.5rem'
const TICK_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png'
const VIDEO_RADIUS = 8

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip is fetched during
// page load at the browser's lowest priority). Playback starts only once the
// section scrolls into view, then loops.

// Desktop only: delay before the first promise fades up (after the heading
// has typed), and the gap between each one and the next.
const PROMISE_DELAY = 800
const PROMISE_STAGGER = 1400

const PROMISES = [
  // '\n' in a title is an explicit line break (rendered with pre-line).
  { title: 'Built by\nIndustry Experts', desc: 'Our courses are built with industry experts to ensure you get the latest area expertise.' },
  { title: 'Ignite\nis Free', desc: 'All of our courses are free. Always have been and always will be.' },
  { title: 'No Educational Prerequisite', desc: 'You don\u2019t need any experience to study. Our curricula is built for all backgrounds.' },
]

// Heading, typed in character by character like "The best courses." in
// section 3. Both line layouts spell the same string, so one animation
// index drives either; the one pause sits on the comma.
const HEADING_DESKTOP_LINES = ['Education should be', 'accessible, personalised', 'and integrated for everyone.']
const HEADING_MOBILE_LINES = ['Education should', 'be accessible,', 'personalised and', 'integrated for', 'everyone.']
const HEADING_TEXT = HEADING_DESKTOP_LINES.join(' ')
const HEADING_HIGHLIGHTS = ['accessible', 'personalised', 'integrated'].map((word) => {
  const start = HEADING_TEXT.indexOf(word)
  return { start, end: start + word.length }
})
const HEADING_PAUSES = [{ after: HEADING_TEXT.indexOf(',') + 1, duration: 1000 }]

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)
  const [typingEnabled, setTypingEnabled] = useState(false)
  const [visiblePromises, setVisiblePromises] = useState<Set<number>>(new Set())
  const promiseRefs = useRef<(HTMLDivElement | null)[]>([])

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

  const isRow = !isMobile && !isTablet

  // Start typing the heading once 30% of the section is on screen (same
  // trigger as section 3).
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTypingEnabled(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const { isComplete: typingComplete, charIndex } = useTypingAnimation(HEADING_TEXT, {
    charDelay: 75,
    // A beat after the section comes into view before the first character.
    startDelay: 500,
    pausePoints: HEADING_PAUSES,
    enabled: typingEnabled,
  })

  // Each promise fades up independently once it crosses 40% from the bottom
  // of the viewport (30% on mobile); desktop waits PROMISE_DELAY before the
  // first and staggers the rest by PROMISE_STAGGER. None
  // of them shows until the heading has fully typed out (see showPromise).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.promiseIdx)
            setVisiblePromises((prev) => new Set(prev).add(idx))
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: isMobile ? '0px 0px -30% 0px' : '0px 0px -40% 0px', threshold: 0 }
    )

    promiseRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [isMobile])

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

  // Render the heading typed up to charIndex. Untyped characters are kept in
  // the flow as transparent text so the block never reflows; highlighted
  // words turn pink as they are typed. No cursor, as in section 3.
  const renderTypedHeading = (lines: string[]) => {
    const isPink = (g: number) => HEADING_HIGHLIGHTS.some((h) => g >= h.start && g < h.end)
    const out: React.ReactNode[] = []
    let lineStart = 0

    lines.forEach((line, lineIdx) => {
      const runs: React.ReactNode[] = []
      let i = 0
      while (i < line.length) {
        const g = lineStart + i
        const typed = g < charIndex
        const pink = isPink(g)
        let j = i + 1
        while (j < line.length && lineStart + j < charIndex === typed && isPink(lineStart + j) === pink) j++
        runs.push(
          <span key={`${lineIdx}-${i}`} style={{ color: typed ? (pink ? '#EF0B72' : 'white') : 'transparent' }}>
            {line.slice(i, j)}
          </span>
        )
        i = j
      }
      out.push(
        <span key={lineIdx}>
          {lineIdx > 0 && <br />}
          {runs}
        </span>
      )
      lineStart += line.length + 1
    })

    return out
  }

  const renderHeading = () => (
    <>
      {/*
        The typed text starts empty and only fills once the client-side
        IntersectionObserver fires, so the server HTML would carry a headless
        heading. The hidden span gives crawlers and screen readers the real
        text; the visible spans carry the typing effect (same pattern as
        LearningModelSection.tsx).
      */}
      <span style={{ visibility: 'hidden', position: 'absolute' }} aria-hidden="true">
        {HEADING_TEXT}
      </span>
      <span className="hidden md:inline" aria-hidden="true">{renderTypedHeading(HEADING_DESKTOP_LINES)}</span>
      <span className="md:hidden" aria-hidden="true">{renderTypedHeading(HEADING_MOBILE_LINES)}</span>
    </>
  )

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
        // Desktop: a box against the left gutter, VIDEO_H of the section's
        // content height and centred vertically within it.
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        left: VIDEO_GUTTER_LEFT,
        width: isWide ? VIDEO_WIDTH : VIDEO_WIDTH_NARROW,
        // Explicit: a replaced element needs a height to be cropped by cover.
        height: `calc(${VIDEO_H} * (100% - 2 * ${SECTION_PAD_Y}))`,
        objectFit: 'cover',
        borderRadius: VIDEO_RADIUS,
        background: '#111',
        pointerEvents: 'none',
        zIndex: 1,
      } : {
        display: 'block',
        // Tablet: a fixed box beside the text. Mobile: 74% width, centred,
        // as a square (a touch narrower and taller than the clip itself).
        width: isMobile ? '74%' : 225,
        height: isMobile ? 'auto' : 'min(48.5vh, 390px)',
        margin: isMobile ? '0 auto' : undefined,
        aspectRatio: isMobile ? '1 / 1' : undefined,
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
        minHeight: isRow ? `calc(${CONTENT_H} + 2 * ${SECTION_PAD_Y})` : undefined,
        display: isRow ? 'flex' : undefined,
        flexDirection: isRow ? 'column' : undefined,
        justifyContent: isRow ? 'center' : undefined,
        // Video on the left against its gutter; the text column ends
        // where section 3's centred 72rem block (plus its 2rem inset) does,
        // mirroring the left edge section 3's heading sits on.
        paddingLeft: isMobile ? '2rem' : VIDEO_GUTTER_LEFT,
        paddingRight: isMobile ? '2rem' : 'calc(max((100% - 72rem) / 2, 2.5rem) + 2rem)',
        overflow: 'hidden',
      }}
    >
      <div
        className="w-full text-white"
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: 'column',
          gridTemplateColumns: isMobile ? undefined : 'auto minmax(0, 1fr)',
          // Tablet and desktop: columns start at the top so the heading
          // lines up with the top of the video. On desktop the grid is the
          // full content height and the text column is padded down to the
          // video's top edge.
          alignItems: isMobile ? 'stretch' : 'start',
          height: isRow ? CONTENT_H : undefined,
          columnGap: isTablet ? '2.5rem' : '3.5rem',
          rowGap: '3rem',
        }}
      >
        {/* Left column: the video. On desktop this only reserves the video's
            width: the panel itself is absolutely positioned on the section.
            On mobile it stacks below the text (order: 2). */}
        {isRow ? (
          <div style={{ width: isWide ? VIDEO_WIDTH : VIDEO_WIDTH_NARROW }} aria-hidden="true" />
        ) : (
          <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', position: 'relative', zIndex: 1, order: isMobile ? 2 : undefined }}>
            {video}
          </div>
        )}

        {/* Right column: heading + promises. Sits 2rem below the top of the
            video on tablet and desktop. */}
        <div style={{ minWidth: 0, paddingTop: isMobile ? 0 : isRow ? `calc(${VIDEO_TOP_OFFSET} + 2rem)` : '2rem' }}>
          {/* A step up from "The best courses." in section 3 (2.5rem / 2.1rem). */}
          <h2 className="font-bold" style={{ fontSize: isMobile ? '2.25rem' : '2.75rem', lineHeight: '1.2' }}>
            <span style={{ display: 'inline', whiteSpace: 'normal' }}>
              {renderHeading()}
            </span>
          </h2>

          <div
            className="auth-promises-list"
            style={{
              // One row of three on tablet and desktop (tick above the text,
              // left-aligned); stacked on mobile with the tick beside the text.
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '2.25rem' : '1.5rem',
              marginTop: isMobile ? '3rem' : '4.5rem',
            }}
          >
            {PROMISES.map((promise, idx) => {
              const showPromise = typingComplete && visiblePromises.has(idx)
              const promiseDelay = isMobile ? 0 : PROMISE_DELAY + idx * PROMISE_STAGGER
              return (
              <div
                key={idx}
                ref={(el) => { promiseRefs.current[idx] = el }}
                data-promise-idx={idx}
                style={{
                  flex: isMobile ? undefined : '1 1 0',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: isMobile ? '1.25rem' : '1rem',
                  opacity: showPromise ? 1 : 0,
                  transform: showPromise ? 'translateY(0)' : 'translateY(15px)',
                  // Delay lives inside the shorthand: React warns when `transition`
                  // and `transitionDelay` are set together on the same element.
                  transition: `opacity 3.5s cubic-bezier(0.16, 1, 0.3, 1) ${promiseDelay}ms, transform 3.5s cubic-bezier(0.16, 1, 0.3, 1) ${promiseDelay}ms`,
                }}
              >
                <img
                  src={TICK_URL}
                  alt=""
                  width={42}
                  height={42}
                  style={{ width: isMobile ? '42px' : '36px', height: isMobile ? '42px' : '36px', flexShrink: 0, marginTop: isMobile ? '-2px' : 0 }}
                />
                {/* Text sits a little narrower than its column so the lines
                    wrap tighter under the tick. */}
                <div style={{ maxWidth: isMobile ? undefined : '85%' }}>
                  <div className="text-xl font-semibold text-white mb-2" style={{ whiteSpace: 'pre-line' }}>
                    {promise.title}
                  </div>
                  <div className="text-base text-white font-normal">
                    {promise.desc}
                  </div>
                </div>
              </div>
            )
            })}
          </div>
        </div>
      </div>
      {isRow && video}
    </section>
  )
}
