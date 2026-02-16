'use client'

import { useState, useEffect, useRef } from 'react'

export default function EducationSection() {
  const [showFeatures, setShowFeatures] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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
      { threshold: 0.3 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Render the heading with pink highlighted words and explicit line breaks
  const renderHeading = () => {
    // Line break structure matches Vite original
    const lines = [
      { text: 'Education should be ', highlights: [] as string[] },
      { text: 'accessible, personalised ', highlights: ['accessible', 'personalised'] },
      { text: 'and integrated for everyone.', highlights: ['integrated'] }
    ]

    return lines.map((line, lineIdx) => {
      let result: React.ReactNode[] = []
      let remaining = line.text

      for (const word of line.highlights) {
        const start = remaining.indexOf(word)
        if (start > 0) {
          result.push(<span key={`${lineIdx}-pre-${word}`}>{remaining.slice(0, start)}</span>)
        }
        result.push(
          <span key={`${lineIdx}-${word}`} className="text-[#EF0B72]">{word}</span>
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
    <section
      ref={sectionRef}
      className="min-h-screen flex items-center justify-center px-8 relative auth-section-2"
      style={{ background: 'black' }}
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
            style={{ width: '100%', gap: '2rem' }}
          >
            {showFeatures && (
              <>
                <div
                  className="flex flex-col items-center"
                  style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '1s', opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className="text-xl font-semibold text-white mb-4" style={{ whiteSpace: 'nowrap' }}>
                    Built by Industry Experts
                  </div>
                  <div className="text-base text-white font-normal">
                    Our courses are built with
                    <br />
                    industry experts to ensure you
                    <br />
                    get the latest area expertise.
                  </div>
                </div>

                <div
                  className="flex flex-col items-center"
                  style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '1.8s', opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className="text-xl font-semibold text-white mb-4" style={{ whiteSpace: 'nowrap' }}>
                    Ignite is Free
                  </div>
                  <div className="text-base text-white font-normal">
                    All of our courses are
                    <br />
                    free. Always have been
                    <br />
                    and always will be.
                  </div>
                </div>

                <div
                  className="flex flex-col items-center"
                  style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '2.6s', opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className="text-xl font-semibold text-white mb-4" style={{ whiteSpace: 'nowrap' }}>
                    No Educational Prerequisite
                  </div>
                  <div className="text-base text-white font-normal">
                    You don&apos;t need any experience
                    <br />
                    to study. Our curricula is built
                    <br />
                    for all backgrounds.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
