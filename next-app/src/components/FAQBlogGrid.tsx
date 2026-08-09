'use client'

import { useState, useEffect } from 'react'
import type { BlogPost } from '@/types/blog'
import type { FAQ } from '@/lib/faqs'
import BlogCarousel from './BlogCarousel'

/**
 * The FAQ accordion and the blog carousel, side by side.
 *
 * Extracted from welcome/FAQSection so /jobs can show the same pair without a
 * second copy of the accordion — the open/close transitions here are hand-tuned
 * to four different durations and two easing curves, and two copies would drift
 * apart the first time either was touched.
 *
 * What is deliberately NOT here is the section shell: background, width, the
 * gutters and whether the block is pinned to the viewport. Those are the parts
 * the two pages genuinely disagree about. /welcome is a scroll-snap deck whose
 * panels are 100vh and whose padding is measured off its hero; /jobs is an
 * ordinary scrolling page that has to line up with the 762px board column. So
 * each page owns its own shell and drops this grid inside it.
 *
 * Blog sits left on desktop (order-1) and the FAQs right, which reads against
 * the source order — the FAQs are the more important content and come first in
 * the DOM for a screen reader and for a phone, where the grid collapses to one
 * column and the visual order follows the markup.
 */

interface FAQBlogGridProps {
  faqs: FAQ[]
  posts?: BlogPost[]
  /** Heading above the carousel. */
  blogHeading?: string
}

export default function FAQBlogGrid({
  faqs,
  posts = [],
  blogHeading = 'Latest from Ignite',
}: FAQBlogGridProps) {
  const [expandedFAQ, setExpandedFAQ] = useState(0)
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

  return (
    <div className={`grid gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {/* FAQs Column */}
      <div className={isMobile ? '' : 'order-2 pl-4'}>
        {/* 600/-0.01em rather than text-3xl's default bold and zero tracking.
            Tailwind's type scale sets no letter-spacing at this size, so these
            rendered looser than every other heading on the page — the hero runs
            -0.02em and the job titles -0.01em. Kept in step with the blog
            heading below; the two read as a pair. */}
        <h3 className="font-semibold tracking-[-0.01em] text-white mb-4 text-left text-3xl">
          FAQs
        </h3>

        <div className="space-y-3 w-full">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded cursor-pointer"
              onClick={() => setExpandedFAQ(expandedFAQ === idx ? -1 : idx)}
              style={{
                backgroundColor: expandedFAQ === idx ? '#FFFFFF' : '#F0F0F2',
                padding: expandedFAQ === idx ? '1rem 1rem 1.2rem 1.2rem' : '1rem 1rem 1rem 1.2rem',
                transition: isMobile
                  ? 'background-color 0.8s cubic-bezier(0.16, 1, 0.3, 1), padding 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'background-color 1s cubic-bezier(0.25, 1, 0.5, 1), padding 1s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
              onMouseEnter={isMobile ? undefined : () => setExpandedFAQ(idx)}
            >
              <h4
                className="font-semibold leading-tight"
                style={{
                  fontSize: '20px',
                  color: expandedFAQ === idx ? '#7714E0' : '#000000',
                  transition: isMobile ? 'color 0.8s cubic-bezier(0.16, 1, 0.3, 1)' : 'color 1s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                {faq.question}
              </h4>
              {/* 0fr → 1fr rather than height:auto, which is not animatable.
                  The inner overflow-hidden is what makes the grid row clip. */}
              <div
                className="grid"
                style={{
                  gridTemplateRows: expandedFAQ === idx ? '1fr' : '0fr',
                  transition: isMobile
                    ? 'grid-template-rows 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'grid-template-rows 1s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                <div className="overflow-hidden">
                  <p
                    className="text-black text-sm mt-1 pb-1"
                    style={{
                      opacity: expandedFAQ === idx ? 1 : 0,
                      transition: isMobile ? 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
                      transitionDelay: expandedFAQ === idx ? (isMobile ? '200ms' : '200ms') : '0ms'
                    }}
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blog Column */}
      <div className={`flex flex-col justify-start ${isMobile ? '' : 'order-1'}`} style={isMobile ? { marginTop: '23px' } : undefined}>
        <div className="w-full">
          {/* Matches the FAQs heading above — see the note there. */}
          <h3 className="font-semibold tracking-[-0.01em] text-white text-left text-3xl mb-4">
            {blogHeading}
          </h3>
          {posts.length > 0 ? (
            <BlogCarousel posts={posts} />
          ) : (
            <div className="h-48 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
              Updates coming soon...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
