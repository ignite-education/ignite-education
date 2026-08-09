'use client'

import { useState, useEffect } from 'react'
import type { BlogPost } from '@/types/blog'
import type { FAQ } from '@/lib/faqs'
import FAQBlogGrid from '@/components/FAQBlogGrid'

/**
 * Welcome's final panel: the FAQ/blog grid, plus the scroll-back-to-top CTA.
 *
 * The shell is what makes this welcome-specific — 100vh so WelcomeScrollManager
 * can snap to it, and gutters measured off the hero rather than a content
 * column. /jobs renders the same grid inside its own shell; see
 * components/FAQBlogGrid.
 */

interface FAQSectionProps {
  faqs: FAQ[]
  posts?: BlogPost[]
}

export default function FAQSection({ faqs, posts = [] }: FAQSectionProps) {
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

  return (
    <section className="flex items-center justify-center bg-black" style={{ height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? undefined : '500px', maxHeight: isMobile ? undefined : '800px', paddingTop: isMobile ? '55px' : undefined, paddingBottom: isMobile ? '2rem' : undefined }}>
      <div
        className="w-full text-white"
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          paddingLeft: isMobile ? '2rem' : isTablet ? '1rem' : 'calc(40px + 99px + 10px)',
          paddingRight: isMobile ? '2rem' : isTablet ? '1rem' : 'calc(40px + 85px)',
        }}
      >
        <div className="mb-8">
          <FAQBlogGrid faqs={faqs} posts={posts} />
        </div>

        {/* Get Started Button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (isMobile) {
                const start = window.scrollY
                const startTime = performance.now()
                const duration = 1800
                const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
                const step = (now: number) => {
                  const progress = Math.min((now - startTime) / duration, 1)
                  window.scrollTo(0, start * (1 - ease(progress)))
                  if (progress < 1) requestAnimationFrame(step)
                }
                requestAnimationFrame(step)
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className="bg-[#EF0B72] hover:bg-[#D50A65] text-white font-semibold py-3 px-8 rounded transition"
          >
            Get Started
          </button>
        </div>
      </div>
    </section>
  )
}
