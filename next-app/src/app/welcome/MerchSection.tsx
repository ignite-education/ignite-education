'use client'

import { useState, useEffect, useRef } from 'react'
import useTypingAnimation from '@/hooks/useTypingAnimation'

// Same five products, in the same order, as the merch rail on /progress
// (src/components/ProgressHubV2/sections/MerchandiseSection.jsx).
const merchItems = [
  {
    src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/15296564955925613761_2048.jpg.webp',
    alt: 'Tote bag',
    url: 'https://shop.ignite.education/products/tote-bag-1?variant=53677278495051'
  },
  {
    src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/6000531078946675470_2048.jpg.webp',
    alt: 'Black Mug',
    url: 'https://shop.ignite.education/products/black-mug-11oz-15oz?variant=53677361889611'
  },
  {
    src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/15764184527208086102_2048%20(1).jpg',
    alt: 'Notebook',
    url: 'https://shop.ignite.education/products/notebook?variant=53241113084235'
  },
  {
    src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/14638277160201691379_2048.webp',
    alt: 'Quote Tote',
    url: 'https://shop.ignite.education/products/copy-of-empowering-quote-organic-cotton-tote-bag-eco-friendly-shopper-sustainable-gift-motivational-bag-reusable-grocery-tote-1?variant=53677328367947'
  },
  {
    src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/13210320553437944029_2048.jpg.webp',
    alt: 'Sweatshirt',
    url: 'https://shop.ignite.education/products/unisex-heavy-blend™-crewneck-sweatshirt?variant=53677325254987'
  }
]

export default function MerchSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [typingEnabled, setTypingEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
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
      <div className="auth-section-merch-content w-full text-left" style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Title Container */}
        <div className="auth-section-merch-title-container max-w-4xl mx-auto px-4">
          <h3
            className="auth-section-merch-title font-bold text-left"
            style={{
              fontSize: '2.5rem',
              lineHeight: '1.2',
              marginTop: isMobile ? 0 : '1rem',
              marginBottom: isMobile ? '0.6rem' : '1rem',
              minHeight: isMobile ? '5rem' : '3rem'
            }}
          >
            {/*
              Same as LearningModelSection: the typed heading is empty in the
              server HTML until the client animation runs, so the crawlable
              text is carried by a hidden span. isMobile is false server-side,
              so this uses the desktop wording.
            */}
            <span style={{ visibility: 'hidden', position: 'absolute' }} aria-hidden="true">
              Big dreams. Universal fit.
            </span>
            <span style={{ position: 'relative' }}>
              {renderTypedHeading()}
            </span>
          </h3>
          <p style={{
            fontSize: '1.125rem',
            color: 'black',
            marginBottom: '1.5rem'
          }}>
            Discover official Ignite merchandise, with all profit supporting education and social mobility projects across the UK.
          </p>
        </div>

        {/*
          Images: one CSS-driven layout that reflows on resize without any JS
          breakpoint state. Below 1024px the five products sit in a snapping
          rail whose items widen as the viewport does (45% -> 30% -> 22%), so
          there is always a partial item peeking to signal the scroll. From
          1024px up they shrink to fit and the whole set is visible in a row.
        */}
        <div className="auth-section-merch-grid w-full px-4 sm:px-6 lg:pl-[9%] lg:pr-[8%]">
          {/* Below sm the rail bleeds to the screen edges (-mx-8 cancels this
              wrapper's px-4 plus the section's 1rem) while px-8 keeps the first
              product aligned with the copy above, so the next item peeks in. */}
          <div className="flex items-center hide-scrollbar overflow-x-auto lg:overflow-visible snap-x snap-mandatory gap-3 md:gap-4 lg:gap-[clamp(12px,1.5vw,32px)] -mx-8 px-8 scroll-pl-8 sm:mx-0 sm:px-0 sm:scroll-pl-0">
            {merchItems.map((item) => (
              <a
                key={item.alt}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[0_0_45%] sm:flex-[0_0_30%] md:flex-[0_0_22%] lg:flex-[1_1_0%] lg:min-w-0 snap-start"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto object-contain rounded-lg transition-transform duration-200 hover:scale-[1.02]"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
