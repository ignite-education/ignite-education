'use client'

import { useState, useEffect, useRef } from 'react'

export default function EducationSection() {
  const [showFeatures, setShowFeatures] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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
      <div className="max-w-4xl w-full text-white">
        <div className="w-full max-w-3xl mx-auto px-4">
          {/* Main Heading */}
          <h2
            className="text-4xl md:text-5xl font-bold leading-tight text-center w-full auth-education-heading"
            style={{ minHeight: '240px' }}
          >
            <span style={{ display: 'inline', whiteSpace: 'normal' }}>
              {renderHeading()}
            </span>
          </h2>

          {/* Feature bullets */}
          <div
            className="w-full auth-features-container"
            style={{ minHeight: '280px', marginTop: '2rem' }}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-3 text-center auth-promises-list"
              style={{ width: '120%', marginLeft: '-10%', gap: '4rem' }}
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
      </div>
    </section>
  )
}
