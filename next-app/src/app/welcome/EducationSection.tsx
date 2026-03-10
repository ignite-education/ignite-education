'use client'

import { useState, useEffect, useRef } from 'react'

export default function EducationSection() {
  const [showFeatures, setShowFeatures] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
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

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowFeatures(true)
          observer.disconnect()
        }
      },
      { threshold: isMobile ? 0.1 : 0.5 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [isMobile])

  // Mobile: observe each promise individually for staggered fade-in
  useEffect(() => {
    if (!isMobile) return

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
      { threshold: 0.4 }
    )

    promiseRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [isMobile])

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
        let result: React.ReactNode[] = []
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
    <section
      ref={sectionRef}
      className="flex items-center justify-center px-8 relative auth-section-2"
      style={{ background: 'black', minHeight: '500px', maxHeight: isMobile ? undefined : '800px', height: isMobile ? 'auto' : '100vh', maxWidth: '1500px', margin: '0 auto', paddingTop: isMobile ? '5rem' : undefined, paddingBottom: isMobile ? '5rem' : undefined }}
    >
      <div className="w-full text-white">
        {/* Heading — stays centered with max-w-3xl */}
        <div className="w-full max-w-3xl mx-auto px-4">
          <h2
            className="text-4xl md:text-5xl font-bold leading-tight text-center w-full auth-education-heading"
            style={{ minHeight: '240px' }}
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
            className={`grid text-center auth-promises-list ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}
            style={{ width: '100%', gap: isMobile ? '2rem' : '0.5rem' }}
          >
            {(isMobile || showFeatures) && (
              <>
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
                    style={isMobile ? {
                      opacity: visiblePromises.has(idx) ? 1 : 0,
                      transform: visiblePromises.has(idx) ? 'translateY(0)' : 'translateY(20px)',
                      transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
                    } : {
                      animation: 'fadeInUp 1.5s ease-out',
                      animationDelay: `${1 + idx * 0.8}s`,
                      opacity: 0,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <div className="text-xl font-semibold text-white mb-3" style={{ whiteSpace: 'nowrap' }}>
                      {promise.title}
                    </div>
                    <div className="text-base text-white font-normal">
                      {promise.desc}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
