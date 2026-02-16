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
    <section className="min-h-screen flex items-center justify-center bg-black">
      <div
        className="w-full text-white"
        style={{
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
                  className="rounded cursor-pointer transition-all duration-300"
                  onClick={() => setExpandedFAQ(expandedFAQ === idx ? -1 : idx)}
                  style={{
                    backgroundColor: expandedFAQ === idx ? '#FFFFFF' : '#F0F0F2',
                    padding: expandedFAQ === idx ? '1rem 1rem 1.2rem 1.2rem' : '1rem 1rem 1rem 1.2rem',
                  }}
                  onMouseEnter={() => setExpandedFAQ(idx)}
                >
                  <h4
                    className="font-semibold leading-tight transition-all duration-300"
                    style={{
                      fontSize: '20px',
                      color: expandedFAQ === idx ? '#7714E0' : '#000000'
                    }}
                  >
                    {faq.question}
                  </h4>
                  <div
                    className="grid transition-all duration-300"
                    style={{
                      gridTemplateRows: expandedFAQ === idx ? '1fr' : '0fr',
                    }}
                  >
                    <div className="overflow-hidden">
                      <p
                        className="text-black text-sm mt-1 pb-1 transition-opacity duration-200"
                        style={{
                          opacity: expandedFAQ === idx ? 1 : 0,
                          transitionDelay: expandedFAQ === idx ? '100ms' : '0ms'
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
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-[#EF0B72] hover:bg-[#D50A65] text-white font-semibold py-3 px-8 rounded transition"
          >
            Get Started
          </button>
        </div>
      </div>
    </section>
  )
}
