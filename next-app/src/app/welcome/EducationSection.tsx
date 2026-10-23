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
// Panel width on wide desktops; ~80% of the column it sits in so the clip
// floats inside the section rather than filling it edge to edge.
const VIDEO_WIDTH = 380
const VIDEO_WIDTH_NARROW = 328
// Vertical padding of the section on tablet and desktop: section 3's, so the
// two sections are the same height. The video panel is inset by the same
// amount top and bottom.
const SECTION_PAD_Y = '3rem'
// Height of the section's content box on tablet and desktop: the height of
// section 3's course-card block (30px scroll padding + two 249px cards +
// 12px gap + 30px), so the two sections are both 666px tall. The video panel
// takes VIDEO_H of it, centred, and the text column is padded down by the
// same offset so the heading's top lines up with the video's top.
const CONTENT_H = '570px'
const VIDEO_H = 0.88
const VIDEO_TOP_OFFSET = `calc(${(1 - VIDEO_H) / 2} * ${CONTENT_H})`
// Gutter between the section's left edge and the video (tablet and desktop).
const VIDEO_GUTTER_LEFT = '4.5rem'
// Gap between the video column and the text column, in px.
const COLUMN_GAP_TABLET = 40
const COLUMN_GAP_DESKTOP = 56
// Width cap on each promise's description: wraps every one of them to three
// lines on desktop (four where the column is narrower, on tablet), with
// text-wrap: balance evening the lines. Measured at 16px Geist: below 230px
// the first description needs four lines, and from 250px the second fits in
// two, so 235px sits midway between the two cliffs.
const PROMISE_DESC_MAX_WIDTH = 235
const TICK_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png'
const VIDEO_RADIUS = 6

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip is fetched during
// page load at the browser's lowest priority). Playback starts only once the
// section scrolls into view, then loops.

// Desktop only: delay before the first promise fades up once it scrolls
// into view, and the gap between each one and the next.
const PROMISE_DELAY = 500
const PROMISE_STAGGER = 1200

const PROMISES = [
  // '\n' in a title is an explicit line break (rendered with pre-line).
  // Every title is two lines of about the same length.
  { title: 'Built by\nExperts', desc: 'Our courses are built with industry experts to ensure you get the latest area expertise.' },
  { title: 'Ignite\nis Free', desc: 'All of our courses are free. Always have been and always will be.' },
  { title: 'No Educational\nPrerequisite', desc: 'You don\u2019t need any experience to study. Our curricula is built for all backgrounds.' },
]

// Heading, shown in full (no typing animation). Both line layouts spell
// the same string; the highlighted words are pink.
const HEADING_DESKTOP_LINES = ['Education should be', 'accessible, personalised', 'and integrated for everyone.']
const HEADING_MOBILE_LINES = ['Education should', 'be accessible,', 'personalised and', 'integrated for', 'everyone.']
const HEADING_HIGHLIGHTS = ['accessible', 'personalised', 'integrated']

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)
  const [visiblePromises, setVisiblePromises] = useState<Set<number>>(new Set())
  const promiseRefs = useRef<(HTMLDivElement | null)[]>([])
  // The section's right padding, read from the rendered element so the
  // promises row can reach past it (see marginRight below).
  const [sectionPadRight, setSectionPadRight] = useState(0)

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
  const columnGap = isTablet ? COLUMN_GAP_TABLET : COLUMN_GAP_DESKTOP

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const read = () => setSectionPadRight(parseFloat(getComputedStyle(el).paddingRight) || 0)
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isMobile])

  // Each promise fades up independently once it crosses 40% from the bottom
  // of the viewport (30% on mobile); desktop waits PROMISE_DELAY before the
  // first and staggers the rest by PROMISE_STAGGER.
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

  // Heading lines with the highlighted words in pink. Each line is split
  // on word boundaries so a highlight never spans a line's punctuation.
  const renderHeadingLines = (lines: string[]) =>
    lines.map((line, lineIdx) => (
      <span key={lineIdx}>
        {lineIdx > 0 && <br />}
        {line.split(/(\b\w+\b)/).map((part, i) =>
          HEADING_HIGHLIGHTS.includes(part)
            ? <span key={i} style={{ color: '#EF0B72' }}>{part}</span>
            : part
        )}
      </span>
    ))

  const renderHeading = () => (
    <>
      <span className="hidden md:inline">{renderHeadingLines(HEADING_DESKTOP_LINES)}</span>
      <span className="md:hidden">{renderHeadingLines(HEADING_MOBILE_LINES)}</span>
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
        // Section height on tablet and desktop: section 3's (content is
        // centred inside it).
        minHeight: isMobile ? undefined : `calc(${CONTENT_H} + 2 * ${SECTION_PAD_Y})`,
        display: isMobile ? undefined : 'flex',
        flexDirection: isMobile ? undefined : 'column',
        justifyContent: isMobile ? undefined : 'center',
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
          columnGap: `${columnGap}px`,
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

        {/* Right column: heading + promises, both centred. Sits 2rem below
            the top of the video on tablet and desktop, where the column
            ends well inside the section's right padding: it reaches past
            that padding to sit the same distance from the section's right
            edge as from the video, so the heading and promises are centred
            in the space to the right of the video. */}
        <div
          style={{
            minWidth: 0,
            paddingTop: isMobile ? 0 : isRow ? `calc(${VIDEO_TOP_OFFSET} + 2rem)` : '2rem',
            marginRight: isMobile ? undefined : -Math.max(sectionPadRight - columnGap, 0),
            textAlign: 'center',
          }}
        >
          {/* Two steps up from "The best courses." in section 3 (2.5rem / 2.1rem). */}
          <h2 className="font-bold" style={{ fontSize: isMobile ? '2.4rem' : '3rem', lineHeight: '1.2' }}>
            <span style={{ display: 'inline', whiteSpace: 'normal' }}>
              {renderHeading()}
            </span>
          </h2>

          <div
            className="auth-promises-list"
            style={{
              // One row of three on tablet and desktop, stacked on mobile. In
              // each, the tick sits above the title, then the description,
              // all centred.
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '2.25rem' : '1.5rem',
              marginTop: isMobile ? '3rem' : '4.25rem',
            }}
          >
            {PROMISES.map((promise, idx) => {
              const showPromise = visiblePromises.has(idx)
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
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
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
                  style={{ width: isMobile ? '36px' : '32px', height: isMobile ? '36px' : '32px', flexShrink: 0, marginBottom: '1rem' }}
                />
                <div className="text-xl font-semibold text-white mb-2" style={{ whiteSpace: 'pre-line' }}>
                  {promise.title}
                </div>
                {/* Three or four even lines (see PROMISE_DESC_MAX_WIDTH). */}
                <div
                  className="text-base text-white font-normal"
                  style={{ maxWidth: `min(100%, ${PROMISE_DESC_MAX_WIDTH}px)`, textWrap: 'balance' }}
                >
                  {promise.desc}
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
