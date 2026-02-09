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

  const { displayText: typedText } = useTypingAnimation(
    'Building a smarter, \nmore personalised era of education.',
    {
      charDelay: 75,
      startDelay: 1000,
      pausePoints: [{ after: 19, duration: 700 }],
      enabled: typingEnabled
    }
  )

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
      { threshold: 0.3 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

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
      className="min-h-screen flex items-center justify-center px-8 auth-section-4"
      style={{ background: 'black' }}
    >
      <div className="max-w-4xl mx-auto text-white text-left">
        <div className="px-4 auth-section-4-content">
          <h3
            className="font-bold text-white text-left auth-section-4-title"
            style={{ fontSize: '3rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '1.5rem', marginTop: '2rem' }}
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: '3rem',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4
                    className="font-semibold text-white leading-tight"
                    style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}
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
