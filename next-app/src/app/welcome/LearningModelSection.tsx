'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import useTypingAnimation from '@/hooks/useTypingAnimation'

const features = [
  {
    title: <>Levelling up learning with <span className="text-white">smart AI integration</span></>,
    description: 'Learn like never before with Chat with Will, Smart Notes, Voice Over and Knowledge Check, all personalised and bespoke to you.',
    image: 'https://auth.ignite.education/storage/v1/object/public/assets/AI%20v7.png',
    alt: 'Levelling up learning with smart AI integration',
    aspectRatio: '4/3' as const
  },
  {
    title: <>Personalised support from <span className="text-white">industry professionals</span></>,
    description: 'Ignite courses are built by industry professionals. If you want 1:1 support, you can talk to them through Office Hours at a time that suits you.',
    image: 'https://auth.ignite.education/storage/v1/object/public/assets/Expert%20v7.png',
    alt: 'Personalised support from industry professionals',
    aspectRatio: '4/3' as const
  },
  {
    title: <>Connect with the <span className="text-white">global community</span></>,
    description: 'Hear the latest conversation, industry trends and ask a question to other people in your specialism through the global Community Forum.',
    image: 'https://auth.ignite.education/storage/v1/object/public/assets/Community%20v8.png',
    alt: 'Connect with the global community',
    aspectRatio: '4/3' as const
  },
  {
    title: <>Get certified to take<br /><span className="text-white">on your next role</span></>,
    description: "Upon completing the course, you'll get a personalised certification demonstrating your knowledge with future employers and to share on LinkedIn.",
    image: 'https://auth.ignite.education/storage/v1/object/public/assets/Certificate.png',
    alt: 'Get certified to take on your next role',
    aspectRatio: '1/1' as const
  }
]

export default function LearningModelSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [typingEnabled, setTypingEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set())
  const featureTextRefs = useRef<(HTMLDivElement | null)[]>([])
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { displayText: typedText, isComplete: typingComplete } = useTypingAnimation(
    'Building a smarter, \nmore personalised era of education.',
    {
      charDelay: 75,
      startDelay: isMobile ? 300 : 1000,
      pausePoints: [{ after: 19, duration: 700 }],
      enabled: typingEnabled
    }
  )

  useEffect(() => {
    if (!isMobile) return
    if (!typingComplete) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.featureIdx)
            setVisibleFeatures((prev) => new Set(prev).add(idx))
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.4 }
    )

    featureTextRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [isMobile, typingComplete])

  useEffect(() => {
    const target = isMobile ? titleRef.current : sectionRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTypingEnabled(true)
          observer.disconnect()
        }
      },
      { threshold: isMobile ? 0.1 : 0.3, rootMargin: isMobile ? '0px 0px 150px 0px' : '0px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [isMobile])

  const renderTypedTagline = () => {
    const firstLineLength = 'Building a smarter,'.length
    const result: React.ReactNode[] = []

    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === '\n') {
        result.push(<br key={`br-${i}`} />)
        continue
      }

      const isSecondLine = i > firstLineLength
      let end = typedText.length
      for (let j = i; j < typedText.length; j++) {
        if (typedText[j] === '\n') {
          end = j
          break
        }
      }

      const chunk = typedText.substring(i, end)
      if (chunk) {
        result.push(
          <span key={`${isSecondLine ? 'pink' : 'white'}-${i}`} style={{ color: isSecondLine ? '#EF0B72' : 'white' }}>
            {chunk}
          </span>
        )
        i = end - 1
      }
    }

    return result
  }

  return (
    <section
      ref={sectionRef}
      className={`${isMobile ? '' : 'min-h-screen'} flex items-center justify-center px-8 auth-section-4`}
      style={{ background: 'black', paddingBottom: isMobile ? '2rem' : undefined }}
    >
      <div className="max-w-4xl mx-auto text-white text-left">
        <div className="px-0 md:px-4 auth-section-4-content">
          <h3
            ref={titleRef}
            className="font-bold text-white text-left auth-section-4-title"
            style={{ fontSize: 'clamp(2.1rem, 5vw, 3rem)', lineHeight: '1.2', minHeight: isMobile ? '10rem' : '120px', marginBottom: isMobile ? '0' : '1.5rem', marginTop: '2rem' }}
          >
            {renderTypedTagline()}
          </h3>

          <div className="auth-section-4-features">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="auth-section-4-feature"
                style={{
                  marginTop: idx === 0 ? undefined : '3rem',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? '1.5rem' : '3rem',
                  alignItems: 'center'
                }}
              >
                <div
                  ref={(el) => { featureTextRefs.current[idx] = el }}
                  data-feature-idx={idx}
                  style={isMobile ? {
                    opacity: visibleFeatures.has(idx) ? 1 : 0,
                    transform: visibleFeatures.has(idx) ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
                  } : undefined}
                >
                  <h4
                    className="font-semibold text-white leading-tight"
                    style={{ fontSize: isMobile ? '1.6rem' : '1.75rem', marginBottom: '0.5rem', textWrap: isMobile ? 'balance' : undefined }}
                  >
                    {feature.title}
                  </h4>
                  <p className="text-white" style={{ fontSize: '1.1rem' }}>
                    {feature.description}
                  </p>
                </div>
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={600}
                  height={feature.aspectRatio === '1/1' ? 600 : 450}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: 'auto',
                    ...(feature.aspectRatio !== '1/1' ? { aspectRatio: feature.aspectRatio, objectFit: 'cover' as const } : {}),
                    borderRadius: '0.5rem',
                    ...(feature.aspectRatio === '1/1' ? { boxShadow: '0 0 40px 10px rgba(255, 255, 255, 0.15)' } : {})
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
