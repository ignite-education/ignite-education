'use client'

import { useState } from 'react'

interface FAQ {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs: FAQ[]
}

export default function FAQSection({ faqs }: FAQSectionProps) {
  const [expandedFAQ, setExpandedFAQ] = useState(0)

  return (
    <section className="min-h-screen flex items-center justify-center px-8 bg-black">
      <div className="max-w-7xl w-full text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 max-w-7xl mx-auto mb-8">
          {/* FAQs Column */}
          <div className="order-1 md:order-2 md:pl-4">
            <h3 className="font-bold text-white mb-4 text-left text-3xl">
              FAQs
            </h3>

            <div className="space-y-3 w-full md:w-[85%]">
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

          {/* Blog Column Placeholder */}
          <div className="order-2 md:order-1 flex flex-col items-end justify-center md:pl-8">
            <div className="w-full md:w-[85%] md:max-w-[30.8rem] mx-auto">
              <h3 className="font-bold text-white text-left text-3xl mb-2">
                Latest from Ignite
              </h3>
              <div className="h-48 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
                Blog posts will appear here
              </div>
            </div>
          </div>
        </div>

        {/* Get Started Button */}
        <div className="flex justify-center px-4 pb-8">
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
