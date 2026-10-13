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
const OVERLAY_OPACITY = 0.45

// The video is never in the SSR HTML. It mounts (and starts buffering) only
// once the section is within half a viewport, and plays only once the section
// is actually on screen, so the initial page load is unaffected.
type VideoPhase = 'idle' | 'load' | 'play'

export default function EducationSection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPhase, setVideoPhase] = useState<VideoPhase>('idle')
  const [videoVisible, setVideoVisible] = useState(false)
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

  // Two one-shot observers on the full-width wrapper: the first mounts the
  // <video> half a viewport early so it is buffered by the time it is needed,
  // the second starts playback once ~30% of the section is on screen. Both
  // unobserve after firing, so the clip plays exactly once per page view.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (reducedMotion || saveData) return

    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVideoPhase((prev) => (prev === 'idle' ? 'load' : prev))
          loadObserver.disconnect()
        }
      },
      { rootMargin: '50% 0px' }
    )
    const playObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVideoPhase('play')
          playObserver.disconnect()
          loadObserver.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    // On a tall desktop viewport the section already sits inside the prefetch
    // margin at scroll position 0, so without this the clip would start
    // downloading during the initial page load. Waiting for `load` keeps the
    // first paint, LCP and the hero's own assets uncontested. (If the user
    // scrolls the section on screen before then, the play observer below
    // mounts and plays it in one step.)
    const startPrefetch = () => loadObserver.observe(el)
    if (document.readyState === 'complete') {
      startPrefetch()
    } else {
      window.addEventListener('load', startPrefetch, { once: true })
    }
    playObserver.observe(el)
    return () => {
      window.removeEventListener('load', startPrefetch)
      loadObserver.disconnect()
      playObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (videoPhase !== 'play') return
    const video = videoRef.current
    if (!video) return
    // Autoplay policies require muted + playsInline; set muted on the element
    // too, since React only reflects the prop as a property on hydration.
    video.muted = true
    video.play().catch(() => {
      // Blocked (e.g. iOS low-power mode): the section simply stays black.
    })
  }, [videoPhase])

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
    <div ref={wrapperRef} style={{ position: 'relative', background: 'black', overflow: 'hidden' }}>
      {videoPhase !== 'idle' && (
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
          onPlaying={() => setVideoVisible(true)}
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
            opacity: videoVisible ? 1 : 0,
            transition: 'opacity 600ms ease-out',
          }}
        />
      )}
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
