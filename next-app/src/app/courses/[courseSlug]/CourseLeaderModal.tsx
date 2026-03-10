'use client'

import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'

interface CourseLeaderModalProps {
  courseTitle: string
}

const FONT = { fontFamily: 'var(--font-geist-sans), sans-serif' }
const FIELD_BG = '#F6F6F6'

export default function CourseLeaderModal({ courseTitle }: CourseLeaderModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ name: '', email: '', linkedin: '' })

  const errorOutline = (field: string): Record<string, string> => ({
    outline: '0.5px solid',
    outlineColor: invalidFields.has(field) ? '#EF0B72' : 'transparent',
    transition: 'outline-color 0.6s ease',
  })
  const clearError = (field: string) => { if (invalidFields.has(field)) setInvalidFields(prev => { const next = new Set(prev); next.delete(field); return next }) }

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const missing = new Set<string>()
    if (!form.name.trim()) missing.add('name')
    if (!form.email.trim()) missing.add('email')
    if (!form.linkedin.trim()) missing.add('linkedin')
    if (missing.size > 0) {
      setInvalidFields(missing)
      setTimeout(() => setInvalidFields(new Set()), 1300)
      return
    }
    setInvalidFields(new Set())
    setSubmitting(true)

    const subject = encodeURIComponent(`Course Leader Enquiry - ${courseTitle}`)
    const body = encodeURIComponent(
      `Course: ${courseTitle}\n` +
      `Name: ${form.name}\n` +
      `Email: ${form.email}\n` +
      `LinkedIn: https://linkedin.com/in/${form.linkedin}\n`
    )

    setTimeout(() => {
      window.location.href = `mailto:hello@ignite.education?subject=${subject}&body=${body}`
      setTimeout(() => {
        setSubmitting(false)
        handleClose()
      }, 300)
    }, 1500)
  }

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => {
      setShowModal(false)
      setClosing(false)
      setSubmitting(false)
      setForm({ name: '', email: '', linkedin: '' })
    }, 250)
  }

  const openModal = () => {
    setClosing(false)
    setShowModal(true)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="mt-6 text-black hover:text-[#EF0B72] font-medium transition-colors flex items-center gap-0.5"
        style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}
      >
        Become a course leader
        <ChevronRight className="w-4 h-4" />
      </button>

      {showModal && (
        <div
          className={`fixed inset-0 flex items-center justify-center ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
          style={{
            backdropFilter: 'blur(2.4px)',
            WebkitBackdropFilter: 'blur(2.4px)',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
            zIndex: 9999,
          }}
          onClick={handleClose}
        >
          <div
            className={`relative bg-white w-[calc(100vw-2rem)] sm:w-[85vw] md:w-[45vw] ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            style={{
              maxWidth: '600px',
              borderRadius: '6px',
              padding: '1.5rem 1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Title */}
            <h3
              className="text-[1.6rem] font-bold text-black leading-tight tracking-[-0.02em]"
              style={FONT}
            >
              Course Leader
            </h3>

            <p
              className="text-black font-light mt-1 leading-snug mb-5"
              style={{ ...FONT, fontSize: '1rem', letterSpacing: '-0.01em' }}
            >
              Share your expertise and help shape the next generation of professionals. Fill out the form to learn more.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '14px' }}>
              {/* Name */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-[5px]">
                <div className="flex items-center shrink-0 sm:min-w-[90px]">
                  <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                    Name
                  </label>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); clearError('name') }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none transition-colors"
                  style={{ ...FONT, backgroundColor: FIELD_BG, ...errorOutline('name') }}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-[5px]">
                <div className="flex items-center shrink-0 sm:min-w-[90px]">
                  <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                    Email
                  </label>
                </div>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError('email') }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none transition-colors"
                  style={{ ...FONT, backgroundColor: FIELD_BG, ...errorOutline('email') }}
                />
              </div>

              {/* LinkedIn */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-[5px]">
                <div className="flex items-center shrink-0 sm:min-w-[90px]">
                  <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                    LinkedIn
                  </label>
                </div>
                <div
                  className="flex-1 min-w-0 flex items-center rounded-lg py-2 text-sm text-gray-900 cursor-text"
                  style={{ backgroundColor: FIELD_BG, ...errorOutline('linkedin') }}
                  onClick={() => document.getElementById('linkedin-input')?.focus()}
                >
                  <span className="pl-3 select-none text-gray-400 whitespace-nowrap" style={FONT}>linkedin.com/in/</span>
                  <input
                    id="linkedin-input"
                    type="text"
                    value={form.linkedin}
                    onChange={(e) => { setForm({ ...form, linkedin: e.target.value }); clearError('linkedin') }}
                    className="flex-1 min-w-0 bg-transparent pr-3 text-sm text-gray-900 focus:outline-none"
                    style={FONT}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 font-semibold cursor-pointer mt-1 shadow-none hover:shadow-[0_0_12px_rgba(60,60,60,0.36)]"
                style={{
                  ...FONT,
                  fontSize: '0.9rem',
                  borderRadius: '4px',
                  backgroundColor: '#EF0B72',
                  color: 'white',
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                {submitting ? (
                  <span className="inline-flex items-center">
                    {'Submitting...'.split('').map((char, i) => (
                      <span
                        key={i}
                        style={{
                          animation: 'letterFadeIn 0.4s ease forwards',
                          animationDelay: `${i * 0.03}s`,
                          opacity: 0,
                        }}
                      >{char}</span>
                    ))}
                  </span>
                ) : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
