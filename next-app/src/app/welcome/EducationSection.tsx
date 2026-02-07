'use client'

import { useState, useEffect } from 'react'

export default function EducationSection() {
  const [showFeatures, setShowFeatures] = useState(false)

  useEffect(() => {
    // Show features after a short delay
    const timer = setTimeout(() => setShowFeatures(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // Render the heading with pink highlighted words
  const renderHeading = () => {
    const words = ['accessible', 'personalised', 'integrated']
    const text = 'Education should be accessible, personalised and integrated for everyone.'

    // Split and highlight
    let result: React.ReactNode[] = []
    let lastIndex = 0

    words.forEach((word, i) => {
      const start = text.indexOf(word, lastIndex)
      if (start > lastIndex) {
        result.push(<span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>)
      }
      result.push(
        <span key={word} className="text-[#EF0B72]">
          {word}
        </span>
      )
      lastIndex = start + word.length
    })

    if (lastIndex < text.length) {
      result.push(<span key="end">{text.slice(lastIndex)}</span>)
    }

    return result
  }

  return (
    <section
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
                    className="flex flex-col items-center animate-fadeIn"
                    style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
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
                    className="flex flex-col items-center animate-fadeIn"
                    style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
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
                    className="flex flex-col items-center animate-fadeIn"
                    style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}
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
