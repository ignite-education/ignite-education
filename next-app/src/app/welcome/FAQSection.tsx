'use client'

import { useState, useEffect } from 'react'
import type { BlogPost } from '@/types/blog'
import BlogCarousel from '@/components/BlogCarousel'

interface FAQ {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs: FAQ[]
  posts?: BlogPost[]
}

export default function FAQSection({ faqs, posts = [] }: FAQSectionProps) {
  const [expandedFAQ, setExpandedFAQ] = useState(0)
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
    <section className="flex items-center justify-center bg-black" style={{ height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? undefined : '500px', maxHeight: isMobile ? undefined : '800px', paddingTop: isMobile ? '2rem' : undefined, paddingBottom: isMobile ? '2rem' : undefined }}>
      <div
        className="w-full text-white"
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          paddingLeft: isMobile ? '2rem' : isTablet ? '1rem' : 'calc(40px + 99px + 10px)',
          paddingRight: isMobile ? '2rem' : isTablet ? '1rem' : 'calc(40px + 85px)',
        }}
      >
        <div className={`grid gap-8 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {/* FAQs Column */}
          <div className={isMobile ? '' : 'order-2 pl-4'}>
            <h3 className="font-bold text-white mb-4 text-left text-3xl">
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
                      : 'background-color 0.4s ease, padding 0.4s ease',
                  }}
                  onMouseEnter={isMobile ? undefined : () => setExpandedFAQ(idx)}
                >
                  <h4
                    className="font-semibold leading-tight"
                    style={{
                      fontSize: '20px',
                      color: expandedFAQ === idx ? '#7714E0' : '#000000',
                      transition: isMobile ? 'color 0.8s cubic-bezier(0.16, 1, 0.3, 1)' : 'color 0.4s ease',
                    }}
                  >
                    {faq.question}
                  </h4>
                  <div
                    className="grid"
                    style={{
                      gridTemplateRows: expandedFAQ === idx ? '1fr' : '0fr',
                      transition: isMobile
                        ? 'grid-template-rows 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'grid-template-rows 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="overflow-hidden">
                      <p
                        className="text-black text-sm mt-1 pb-1"
                        style={{
                          opacity: expandedFAQ === idx ? 1 : 0,
                          transition: isMobile ? 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'opacity 0.3s ease',
                          transitionDelay: expandedFAQ === idx ? (isMobile ? '200ms' : '150ms') : '0ms'
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
          <div className={`flex flex-col justify-start ${isMobile ? '' : 'order-1'}`}>
            <div className="w-full">
              <h3 className="font-bold text-white text-left text-3xl mb-4">
                Latest from Ignite
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
