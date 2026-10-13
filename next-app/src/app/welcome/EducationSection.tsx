'use client'

import { useState, useEffect, useRef } from 'react'

// Background video (muted, ~0.9 MB, 720p/30fps, no audio track). Hosted in the
// public Supabase `assets` bucket like every other welcome-page image — see
// "Static images on public pages" in docs/ARCHITECTURE.md. Upload a replacement
// with scripts/upload-asset.mjs and bump the filename: the bucket serves a
// one-year cache-control, so the same path would keep serving the old bytes.
const BACKGROUND_VIDEO_URL =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/welcome-education-bg.mp4'
// Black tint over the footage so the white heading and bullets stay readable.
const OVERLAY_OPACITY = 0.6
// The video itself is shown at this rather than fully opaque, so a little of
// the black ground shows through and the footage sits further back.
const VIDEO_OPACITY = 0.7
// The sticky navbar (see WelcomeScrollManager / Navbar) is 65px tall and sits
// in flow above this section. The wrapper is pulled up under it by the same
// amount so the footage shows through the bar's translucent blur; the content
// is padded back down so nothing moves.
const NAVBAR_HEIGHT = 65

// The <video> is server-rendered with preload="auto" so its first frame is
// already there when the user reaches the section (the clip, ~0.9 MB, is
// fetched during page load at the browser's lowest priority). Playback still
// starts only once the section scrolls into view.

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)
  const [visiblePromises, setVisiblePromises] = useState<Set<number>>(new Set())
  const promiseRefs = useRef<(HTMLDivElement | null)[]>([])

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

  // Each promise triggers independently when it crosses 40% from the bottom
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

  // One-shot observer: start playback once ~30% of the section is on screen,
  // then disconnect so the clip plays exactly once per page view.
  useEffect(() => {
    const el = wrapperRef.current
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

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', background: 'black', overflow: 'hidden', marginTop: -NAVBAR_HEIGHT, paddingTop: NAVBAR_HEIGHT }}
    >
      <video
        ref={videoRef}
        src={BACKGROUND_VIDEO_URL}
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
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          opacity: VIDEO_OPACITY,
        }}
      />
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: `rgba(0, 0, 0, ${OVERLAY_OPACITY})`, pointerEvents: 'none' }}
      />
      <section
        ref={sectionRef}
        className="flex items-center justify-center px-8 relative auth-section-2"
        style={{ background: 'transparent', zIndex: 1, minHeight: '500px', maxHeight: isMobile ? undefined : '700px', height: isMobile ? 'auto' : '100vh', maxWidth: '1500px', margin: '0 auto', paddingTop: isMobile ? '7rem' : '8vh', paddingBottom: isMobile ? '5rem' : undefined, overflow: 'hidden' }}
      >
        <div className="w-full text-white">
          {/* Heading — stays centered with max-w-3xl */}
          <div className="w-full max-w-3xl mx-auto px-4" style={{ position: 'relative' }}>
            {/* Decorative images around heading */}
            {/* Star — top left (shown on all viewports) */}
            <img
              src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Star-LandingPage.png"
              alt=""
              style={{ position: 'absolute', top: isMobile ? '-30%' : isTablet ? '-37%' : '-45%', left: isMobile ? '0%' : isTablet ? '7%' : '0%', width: isMobile ? '116px' : isTablet ? '105px' : '149px', pointerEvents: 'none', transform: 'rotate(-29deg)' }}
            />
            {/* Bulb — bottom right (shown on mobile) */}
            {isMobile && (
              <img
                src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Bulb-LandingPage.png"
                alt=""
                style={{ position: 'absolute', bottom: '-20%', right: '3%', width: '80px', pointerEvents: 'none', transform: 'rotate(18deg)' }}
              />
            )}
            {!isMobile && (
              <>
                {/* Bulb — right */}
                <img
                  src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Bulb-LandingPage.png"
                  alt=""
                  style={{ position: 'absolute', bottom: isTablet ? '17%' : '18%', right: isTablet ? '-5%' : '-11%', width: isTablet ? '78px' : '96px', pointerEvents: 'none', transform: 'rotate(29deg)' }}
                />
              </>
            )}
            <h2
              className="text-4xl md:text-5xl font-bold leading-tight text-center w-full auth-education-heading"
              style={{ minHeight: '240px', marginBottom: isMobile ? '4rem' : undefined }}
            >
              <span style={{ display: 'inline', whiteSpace: 'normal' }}>
                {renderHeading()}
              </span>
            </h2>
          </div>
  
          {/* Feature bullets — aligned to navbar bounds */}
          <div
            className="w-full auth-features-container"
            style={{
              minHeight: '118px',
              marginTop: '2rem',
              paddingLeft: isMobile ? '2rem' : isTablet ? '1rem' : 'calc(40px + 99px)',
              paddingRight: isMobile ? '2rem' : isTablet ? '1rem' : 'calc(40px + 85px)',
            }}
          >
            <div
              className={`grid text-center auth-promises-list ${isMobile ? 'grid-cols-1 justify-items-center' : 'grid-cols-3'}`}
              style={{ width: '100%', gap: isMobile ? '3rem' : '0.5rem' }}
            >
              {[
                { title: 'Built by Industry Experts', desc: <>Our courses are built with<br />industry experts to ensure you<br />get the latest area expertise.</> },
                { title: 'Ignite is Free', desc: <>All of our courses are<br />free. Always have been<br />and always will be.</> },
                { title: 'No Educational Prerequisite', desc: <>You don&apos;t need any experience<br />to study. Our curricula is built<br />for all backgrounds.</> }
              ].map((promise, idx) => (
                <div
                  key={idx}
                  ref={(el) => { promiseRefs.current[idx] = el }}
                  data-promise-idx={idx}
                  className="flex flex-col items-center"
                  style={{
                    opacity: visiblePromises.has(idx) ? 1 : 0,
                    transform: visiblePromises.has(idx) ? 'translateY(0)' : 'translateY(15px)',
                    // Delay lives inside the shorthand: React warns when `transition`
                    // and `transitionDelay` are set together on the same element.
                    transition: `opacity 3.5s cubic-bezier(0.16, 1, 0.3, 1) ${isMobile ? 0 : idx * 1000}ms, transform 3.5s cubic-bezier(0.16, 1, 0.3, 1) ${isMobile ? 0 : idx * 1000}ms`,
                  }}
                >
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/White%20Tick.png"
                    alt=""
                    width={48}
                    height={48}
                    className="mb-4"
                    style={{ width: isMobile ? '50px' : '42px', height: isMobile ? '50px' : '42px' }}
                  />
                  <div>
                    <div className="text-xl font-semibold text-white mb-3" style={{ whiteSpace: 'nowrap' }}>
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
      </section>
    </div>
  )
}
