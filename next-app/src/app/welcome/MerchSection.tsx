'use client'

import { useState, useEffect, useRef } from 'react'
import useTypingAnimation from '@/hooks/useTypingAnimation'

const merchItems = [
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/6000531078946675470_2048.jpg.webp',
    alt: 'Black Mug',
    url: 'https://shop.ignite.education/products/black-mug-11oz-15oz?variant=53677361889611'
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/14638277160201691379_2048.webp',
    alt: 'Quote Tote',
    url: 'https://shop.ignite.education/products/copy-of-empowering-quote-organic-cotton-tote-bag-eco-friendly-shopper-sustainable-gift-motivational-bag-reusable-grocery-tote-1?variant=53677328367947',
    desktopOnly: true
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/15764184527208086102_2048%20(1).jpg',
    alt: 'Notebook',
    url: 'https://shop.ignite.education/products/notebook?variant=53241113084235'
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/13210320553437944029_2048.jpg.webp',
    alt: 'Sweatshirt',
    url: 'https://shop.ignite.education/products/unisex-heavy-blend™-crewneck-sweatshirt?variant=53677325254987'
  }
]

export default function MerchSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [typingEnabled, setTypingEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

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

  const headingText = isMobile ? 'Big dreams.\nUniversal fit.' : 'Big dreams. Universal fit.'
  const { displayText: typedHeading } = useTypingAnimation(
    headingText,
    {
      charDelay: 75,
      startDelay: 500,
      pausePoints: [
        { after: 11, duration: 700 }
      ],
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
      { threshold: 0.2, rootMargin: '-100px 0px -100px 0px' }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const renderTypedHeading = () => {
    const text = typedHeading
    const splitIndex = isMobile ? 11 : 12
    const firstPart = text.slice(0, splitIndex)
    const secondPart = text.slice(splitIndex)
    return (
      <>
        <span className="text-black" style={{ whiteSpace: 'pre-wrap' }}>{firstPart}</span>
        <span style={{ color: '#EF0B72', whiteSpace: 'pre-wrap' }}>{secondPart}</span>
      </>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="auth-section-merch flex items-start justify-center px-8"
      style={{
        background: 'white',
        scrollSnapAlign: 'none',
        paddingTop: '5rem',
        paddingBottom: '5rem'
      }}
    >
      <div className="auth-section-merch-content w-full text-left">
        {/* Title Container */}
        <div className="auth-section-merch-title-container max-w-4xl mx-auto px-4">
          <h3
            className="auth-section-merch-title font-bold text-left"
            style={{
              fontSize: '2.5rem',
              lineHeight: '1.2',
              marginTop: '1rem',
              marginBottom: isMobile ? '0.6rem' : '1rem',
              minHeight: isMobile ? '5rem' : '3rem'
            }}
          >
            {renderTypedHeading()}
          </h3>
          <p style={{
            fontSize: '1.125rem',
            color: 'black',
            marginBottom: '1.5rem'
          }}>
            Discover official Ignite merchandise, with all profit supporting education and social mobility projects across the UK.
          </p>
        </div>

        {/* Images Container */}
        <div
          style={{
            width: '100%',
            paddingLeft: isTablet ? '1rem' : 'calc(40px + 99px)',
            paddingRight: isTablet ? '1rem' : 'calc(40px + 85px)'
          }}
          className="auth-section-merch-grid"
        >
          <div
            className={(isMobile || isTablet) ? 'grid grid-cols-2 gap-4' : 'flex justify-between items-center'}
            style={{
              width: '100%',
              maxWidth: isTablet ? '36rem' : 'none',
              margin: isTablet ? '0 auto' : undefined
            }}
          >
            {merchItems.map((item, idx) => {
              if (item.desktopOnly && (isMobile || isTablet)) return null
              return (
                <img
                  key={idx}
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  className={`${isTablet ? 'object-contain' : 'object-cover'} rounded-lg transition-transform duration-200 hover:scale-[1.02] cursor-pointer`}
                  style={{
                    height: (isMobile || isTablet) ? 'auto' : '250px',
                    width: (isMobile || isTablet) ? '100%' : 'auto',
                    maxWidth: (isMobile || isTablet) ? '100%' : '18%'
                  }}
                  onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                />
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
