'use client'

import { useState, useEffect, useRef } from 'react'
import useTypingAnimation from '@/hooks/useTypingAnimation'

const testimonials = [
  {
    quote: "I was pretty lost with my career direction. I joined Ignite, and it helped me identify my strengths and understand different paths I could take. Crazy considering it's free.",
    name: "Amelia C",
    role: "Jr Product Manager",
    avatar: "https://auth.ignite.education/storage/v1/object/public/assets/2.png"
  },
  {
    quote: "Ignite gave me the confidence to explore a new career. Best decision I've made.",
    name: "Sarah M",
    role: "Product Marketing Manager",
    avatar: "https://auth.ignite.education/storage/v1/object/public/assets/1.png"
  },
  {
    quote: "I needed something more than my degree to get into Product Management, so I started the Ignite course. I wish I'd found this sooner!",
    name: "James P",
    role: "Student",
    avatar: "https://auth.ignite.education/storage/v1/object/public/assets/3.png"
  },
  {
    quote: "Taking a career break left me feeling out of touch. So, I joined Ignite and the neat AI features allowed me learn at my own pace.",
    name: "Rebecca T",
    role: "Programme Manager",
    avatar: "https://auth.ignite.education/storage/v1/object/public/assets/4.png"
  },
  {
    quote: "Fresh perspectives that actually made a difference. Working at my own pace meant I could properly reflect and apply what I learned.",
    name: "David M",
    role: "Sr Product Manager",
    avatar: "https://auth.ignite.education/storage/v1/object/public/assets/5.png"
  }
]

const useCaseCards = [
  {
    title: 'Recent Graduates',
    description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.',
    position: { top: '0', left: '0' }
  },
  {
    title: 'Career Break Returners',
    description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.',
    position: { top: '0', left: '11.05rem' }
  },
  {
    title: 'Upskilling in Role',
    description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.',
    position: { top: '10.525rem', left: '0' }
  },
  {
    title: 'Pivotting Careers',
    description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.',
    position: { top: '10.525rem', left: '11.05rem' }
  }
]

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [hoveredUseCase, setHoveredUseCase] = useState<number | null>(null)
  const [testimonialMouseStart, setTestimonialMouseStart] = useState<number | null>(null)
  const [testimonialTouchStart, setTestimonialTouchStart] = useState<number | null>(null)
  const [typingEnabled, setTypingEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  // Responsive detection
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

  // Typing animation
  const { displayText: typedText } = useTypingAnimation(
    'Ignite is for everyone.\nThe curious, the committed, the ambitious.',
    {
      charDelay: 75,
      pausePoints: [
        { after: 23, duration: 700 },
        { after: 37, duration: 700 },
        { after: 52, duration: 700 }
      ],
      enabled: typingEnabled
    }
  )

  // Intersection observer to trigger typing
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
      { threshold: isMobile ? 0.1 : 0.2 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [isMobile])

  const renderTypedHeading = () => {
    const text = typedText
    const firstLineLength = 'Ignite is for everyone.'.length
    const result: React.ReactNode[] = []

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        result.push(<br key={`br-${i}`} />)
        continue
      }
      const isSecondLine = i > firstLineLength
      if (isSecondLine) {
        let end = text.length
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') { end = j; break }
          if (isMobile && text[j] === ',' && j + 1 < text.length && text[j + 1] === ' ') {
            end = j + 2; break
          }
        }
        const chunk = text.substring(i, end)
        if (chunk) {
          result.push(<span key={`pink-${i}`} style={{ color: '#EF0B72' }}>{chunk}</span>)
          if (isMobile && chunk.endsWith(', ')) {
            result.push(<br key={`mbr-${i}`} />)
          }
          i = end - 1
        }
      } else {
        let end = text.length
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') { end = j; break }
        }
        const chunk = text.substring(i, end)
        if (chunk) {
          result.push(<span key={`bw-${i}`} className="auth-section-5-title-text text-black">{chunk}</span>)
          i = end - 1
        }
      }
    }
    return result
  }

  return (
    <section
      ref={sectionRef}
      className="auth-section-5 flex items-start justify-center px-8"
      style={{
        background: isMobile ? 'black' : 'white',
        scrollSnapAlign: 'none',
        paddingTop: '5rem',
        paddingBottom: '0'
      }}
    >
      <div className="auth-section-5-content w-full text-left">
        {/* Title Container */}
        <div className="auth-section-5-title-container max-w-4xl mx-auto px-4">
          <h3
            className="auth-section-5-title font-bold text-left"
            style={{
              fontSize: '2.5rem',
              lineHeight: '1.2',
              minHeight: isMobile ? '10rem' : '7.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <span style={{ visibility: 'hidden', position: 'absolute' }} aria-hidden="true">
              {isMobile ? (
                <>Ignite is for everyone.<br />The curious,<br />the committed,<br />the ambitious.</>
              ) : (
                <>Ignite is for everyone.<br />The curious, the committed, the ambitious.</>
              )}
            </span>
            <span style={{ position: 'relative' }}>
              {renderTypedHeading()}
            </span>
          </h3>
        </div>

        {/* Testimonials and Cards Container */}
        <div style={{ maxWidth: '70rem', paddingLeft: '4rem', paddingRight: '0rem' }} className="auth-section-5-grid mx-auto">
          <div className="grid grid-cols-2 gap-4 items-start">
            {/* Left Column - Testimonials Slider */}
            <div
              className="auth-testimonial-container flex flex-col justify-center"
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => {
                e.preventDefault()
                setTestimonialMouseStart(e.clientX)
              }}
              onMouseUp={(e) => {
                if (testimonialMouseStart === null) return
                const diff = testimonialMouseStart - e.clientX
                if (Math.abs(diff) > 50) {
                  setCurrentTestimonial((prev) => diff > 0 ? (prev + 1) % 5 : (prev - 1 + 5) % 5)
                }
                setTestimonialMouseStart(null)
              }}
              onTouchStart={(e) => setTestimonialTouchStart(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (testimonialTouchStart === null) return
                const diff = testimonialTouchStart - e.changedTouches[0].clientX
                if (Math.abs(diff) > 50) {
                  setCurrentTestimonial((prev) => diff > 0 ? (prev + 1) % 5 : (prev - 1 + 5) % 5)
                }
                setTestimonialTouchStart(null)
              }}
            >
              <div className="relative">
                {testimonials.map((testimonial, idx) => (
                  <div
                    key={idx}
                    className="auth-testimonial-card rounded flex items-center justify-center"
                    style={{
                      backgroundColor: '#F0F0F2',
                      position: idx === 0 ? 'relative' : 'absolute',
                      top: idx === 0 ? 'auto' : 0,
                      left: idx === 0 ? 'auto' : 0,
                      right: idx === 0 ? 'auto' : 0,
                      opacity: currentTestimonial === idx ? 1 : 0,
                      pointerEvents: currentTestimonial === idx ? 'auto' : 'none',
                      transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      width: '36rem',
                      height: '19rem',
                      overflow: 'visible',
                      padding: '1rem 1.5rem 1.5rem 1.5rem'
                    }}
                  >
                    <div className="auth-testimonial-quote-wrapper" style={{ paddingBottom: '3.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.625rem' }}>
                      <p className="auth-testimonial-quote text-gray-900 text-2xl font-medium leading-snug text-left" style={{ maxWidth: '80%' }}>
                        <span style={{ fontWeight: 'bold' }}>&ldquo;</span>{testimonial.quote}<span style={{ fontWeight: 'bold' }}>&rdquo;</span>
                      </p>
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.75rem',
                        left: '1.5rem',
                        right: '1.5rem',
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    >
                      <div className="auth-testimonial-info" style={{ width: '80%', lineHeight: '1.2' }}>
                        <div className="font-semibold text-black">{testimonial.name}</div>
                        <div className="auth-testimonial-role text-sm text-gray-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Carousel Indicators */}
                <div
                  className="auth-testimonial-card"
                  style={{
                    marginTop: '1rem',
                    padding: isMobile ? '0' : '0 1.5rem',
                    boxSizing: 'border-box',
                    backgroundColor: 'transparent',
                    height: 'auto',
                    display: 'flex',
                    justifyContent: isMobile ? 'flex-start' : 'center'
                  }}
                >
                  <div
                    className="auth-testimonial-indicators flex justify-start gap-2"
                    style={{ width: isMobile ? 'auto' : '80%' }}
                  >
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTestimonial(idx)}
                        className={`transition-all duration-300 ${
                          currentTestimonial === idx
                            ? 'bg-[#EF0B72]'
                            : isMobile ? 'bg-white hover:bg-gray-300' : 'bg-[#F0F0F2] hover:bg-gray-300'
                        }`}
                        style={{
                          width: currentTestimonial === idx ? '2rem' : '0.625rem',
                          height: '0.625rem',
                          borderRadius: '0.125rem'
                        }}
                        aria-label={`Go to testimonial ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 2x2 Grid of Cards */}
            <div className="auth-usecase-container flex items-center justify-center">
              <div className="auth-usecase-grid relative" style={{ width: (isMobile || isTablet) ? '100%' : '21.35rem', height: (isMobile || isTablet) ? 'auto' : '20.3rem' }}>
                {(() => {
                  if (isMobile || isTablet) {
                    return (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: '1.5rem'
                      }}>
                        {useCaseCards.map((card, idx) => (
                          <div key={idx}>
                            <h4 className="font-semibold leading-tight" style={{
                              color: '#7714E0',
                              fontSize: '1.1rem',
                              textAlign: 'left',
                              marginBottom: '0'
                            }}>
                              {card.title}
                            </h4>
                            <p className="text-black leading-relaxed" style={{ fontSize: '1rem', textAlign: 'left' }}>
                              {card.description.split('.')[0] + '.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )
                  }

                  return useCaseCards.map((card, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredUseCase(idx)}
                      onMouseLeave={() => setHoveredUseCase(null)}
                      className="rounded flex items-center justify-center cursor-pointer absolute"
                      style={{
                        backgroundColor: '#F0F0F2',
                        height: '9.775rem',
                        width: '10.3rem',
                        top: card.position.top,
                        left: card.position.left,
                        padding: '1.5rem',
                        opacity: hoveredUseCase !== null ? 0 : 1,
                        transition: 'all 300ms ease-in-out',
                        pointerEvents: 'auto'
                      }}
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        <h4 className="font-semibold leading-tight" style={{
                          color: '#7714E0',
                          fontSize: '1.125rem'
                        }}>
                          {card.title === 'Career Break Returners' ? (
                            <>Career Break<br />Returners</>
                          ) : card.title === 'Upskilling in Role' ? (
                            <>Upskilling<br />in Role</>
                          ) : card.title}
                        </h4>
                      </div>
                    </div>
                  ))
                })()}

                {/* Single overlay card that covers entire grid - desktop only */}
                {!isMobile && !isTablet && (
                  <div
                    onMouseEnter={() => {
                      if (hoveredUseCase !== null) {
                        setHoveredUseCase(hoveredUseCase)
                      }
                    }}
                    onMouseLeave={() => setHoveredUseCase(null)}
                    className="absolute rounded flex items-center justify-center"
                    style={{
                      backgroundColor: '#F0F0F2',
                      top: 0,
                      left: 0,
                      width: '21.35rem',
                      height: '20.3rem',
                      zIndex: 10,
                      padding: '2rem',
                      opacity: hoveredUseCase !== null ? 1 : 0,
                      visibility: hoveredUseCase !== null ? 'visible' : 'hidden',
                      transition: 'opacity 300ms ease-in-out, visibility 300ms ease-in-out',
                      pointerEvents: hoveredUseCase !== null ? 'auto' : 'none'
                    }}
                  >
                    <div className="flex flex-col items-center justify-center text-center" style={{
                      animation: hoveredUseCase !== null ? 'fadeIn 400ms ease-in forwards' : 'none',
                      animationDelay: '100ms',
                      opacity: 0
                    }}>
                      <h4 className="font-semibold leading-tight text-2xl mb-4" style={{
                        color: '#7714E0'
                      }}>
                        {hoveredUseCase !== null ? useCaseCards[hoveredUseCase].title : ''}
                      </h4>
                      <p className="text-black text-base leading-relaxed">
                        {hoveredUseCase !== null ? useCaseCards[hoveredUseCase].description : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
