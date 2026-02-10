'use client'

import { useState } from 'react'
import type { FAQ } from '@/types/course'

interface FAQSectionProps {
  faqs: FAQ[]
}

export default function FAQSection({ faqs }: FAQSectionProps) {
  const [expandedFAQ, setExpandedFAQ] = useState(0)

  return (
    <div className="mt-9 mb-8 faq-section">
      <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
        FAQs
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded cursor-pointer"
            style={{
              backgroundColor: '#F0F0F2',
              overflow: 'hidden',
              paddingTop: '1rem',
              paddingRight: '1rem',
              paddingBottom: '1rem',
              paddingLeft: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
            onMouseEnter={() => setExpandedFAQ(idx)}
          >
            <h4
              className="font-semibold leading-tight transition-all duration-500"
              style={{ fontSize: '20px', color: expandedFAQ === idx ? '#7714E0' : '#000000' }}
            >
              {faq.question}
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateRows: expandedFAQ === idx ? '1fr' : '0fr',
                transition: 'grid-template-rows 500ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <p
                  className="text-black text-sm"
                  style={{ marginTop: 'calc(0.1rem + 2px)', paddingBottom: '0' }}
                >
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
