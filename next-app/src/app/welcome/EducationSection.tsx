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
const VIDEO_WIDTH = 413
const VIDEO_WIDTH_NARROW = 356
// Vertical padding of the section on desktop; the video panel is inset by
// the same amount top and bottom.
const SECTION_PAD_Y = '4vh'
const TICK_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png'
const VIDEO_RADIUS = 8

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip is fetched during
// page load at the browser's lowest priority). Playback starts only once the
// section scrolls into view, then loops.

const PROMISES = [
  // '\n' in a title is an explicit line break (rendered with pre-line).
  { title: 'Built by\nIndustry Experts', desc: 'Our courses are built with industry experts' },
  { title: 'Ignite\nis Free', desc: 'All of our courses are free.' },
  { title: 'No Educational Prerequisite', desc: 'Our curricula is built for all backgrounds.' },
]

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)
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

  // Each promise fades up independently once it crosses 40% from the bottom
  // of the viewport (30% on mobile); desktop staggers them by 600ms.
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

  // Render the heading with pink highlighted words and explicit line breaks
  const renderHeading = () => {
    // Desktop line breaks (md+)
    const desktopLines = [
      { text: 'Education should be ', highlights: [] as string[] },
      { text: 'accessible, personalised ', highlights: ['accessible', 'personalised'] },
      { text: 'and integrated for everyone.', highlights: ['integrated'] }
    ]

    // Mobile line breaks
    const mobileLines = [
      { text: 'Education should', highlights: [] as string[] },
      { text: 'be accessible,', highlights: ['accessible,'] },
      { text: 'personalised and', highlights: ['personalised'] },
      { text: 'integrated for', highlights: ['integrated'] },
      { text: 'everyone.', highlights: [] as string[] }
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
        // Desktop: a box against the left gutter, 81% of the section's
        // content height and centred vertically within it.
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        left: '2.5rem',
        width: isWide ? VIDEO_WIDTH : VIDEO_WIDTH_NARROW,
        // Explicit: a replaced element needs a height to be cropped by cover.
        height: `calc(0.81 * (100% - 2 * ${SECTION_PAD_Y}))`,
        objectFit: 'cover',
        borderRadius: VIDEO_RADIUS,
        background: '#111',
        pointerEvents: 'none',
        zIndex: 1,
      } : {
        display: 'block',
        // Tablet: a fixed box beside the text. Mobile: 81% width, centred,
        // at the clip's own aspect.
        width: isMobile ? '81%' : 243,
        height: isMobile ? 'auto' : 'min(44.5vh, 356px)',
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
        // Video on the left against the 2.5rem gutter; the text column ends
        // where section 3's centred 72rem block (plus its 2rem inset) does,
        // mirroring the left edge section 3's heading sits on.
        paddingLeft: isMobile ? '2rem' : '2.5rem',
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
          alignItems: isMobile ? 'stretch' : 'center',
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

        {/* Right column: heading + promises */}
        <div style={{ minWidth: 0 }}>
          {/* Same size and line height as "The best courses." in section 3. */}
          <h2 className="font-bold" style={{ fontSize: isMobile ? '2.1rem' : '2.5rem', lineHeight: '1.2' }}>
            <span style={{ display: 'inline', whiteSpace: 'normal' }}>
              {renderHeading()}
            </span>
          </h2>

          <div
            className="auth-promises-list"
            style={{
              // One row of three on tablet and desktop (tick above the text,
              // everything centred); stacked on mobile with the tick beside
              // the text.
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '2.25rem' : '1.5rem',
              marginTop: isMobile ? '3rem' : '4rem',
            }}
          >
            {PROMISES.map((promise, idx) => (
              <div
                key={idx}
                ref={(el) => { promiseRefs.current[idx] = el }}
                data-promise-idx={idx}
                style={{
                  flex: isMobile ? undefined : '1 1 0',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  textAlign: isMobile ? 'left' : 'center',
                  gap: isMobile ? '1.25rem' : '1rem',
                  opacity: visiblePromises.has(idx) ? 1 : 0,
                  transform: visiblePromises.has(idx) ? 'translateY(0)' : 'translateY(15px)',
                  // Delay lives inside the shorthand: React warns when `transition`
                  // and `transitionDelay` are set together on the same element.
                  transition: `opacity 3.5s cubic-bezier(0.16, 1, 0.3, 1) ${isMobile ? 0 : idx * 600}ms, transform 3.5s cubic-bezier(0.16, 1, 0.3, 1) ${isMobile ? 0 : idx * 600}ms`,
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
            ))}
          </div>
        </div>
      </div>
      {isRow && video}
    </section>
  )
}
