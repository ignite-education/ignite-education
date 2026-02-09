'use client'

import { useState, useEffect } from 'react'

interface CourseRequestModalProps {
  courseName: string
  onClose: () => void
}

export default function CourseRequestModal({ courseName, onClose }: CourseRequestModalProps) {
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
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
        className={`relative bg-[#F8F8F8] ${closing ? 'animate-scaleDown' : 'animate-scaleUp'}`}
        style={{ width: '440px', maxWidth: '90vw', padding: '3rem 2.5rem 2.5rem', borderRadius: '6px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Heading */}
        <h3
          className="text-[1.65rem] font-bold text-black text-center leading-tight tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          We&rsquo;ve added{' '}
          <span className="text-[#EF0B72]">{courseName}</span>
          {' '}to our upcoming course list
        </h3>

        {/* Sign-in buttons */}
        <div className="space-y-3 mt-8">
          <a
            href="/sign-in"
            className="flex items-center justify-center gap-3 bg-white rounded-xl px-5 py-3 font-medium text-black hover:bg-gray-50 transition"
            style={{ boxShadow: '0 0 10px rgba(103,103,103,0.2)', fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            Continue with Google
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </a>

          <a
            href="/sign-in"
            className="flex items-center justify-center gap-3 bg-white rounded-xl px-5 py-3 font-medium text-black hover:bg-gray-50 transition"
            style={{ boxShadow: '0 0 10px rgba(103,103,103,0.2)', fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            Continue with LinkedIn
            <svg width="20" height="20" viewBox="0 0 48 48">
              <rect width="48" height="48" rx="4" fill="#0077B5"/>
              <path fill="#fff" d="M14.5 19.5h-4v13h4v-13zm-2-6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm21.5 6.2c-2.2 0-3.6 1.2-4.2 2.3h-.1v-2h-4v13h4v-6.4c0-1.7.3-3.3 2.4-3.3s2.1 1.9 2.1 3.4v6.3h4v-7.1c0-3.5-.8-6.2-4.2-6.2z"/>
            </svg>
          </a>
        </div>

        {/* Subtext */}
        <p
          className="text-black text-center mt-6 text-[0.95rem] font-medium tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          Register and we&rsquo;ll let<br />you know when it launches
        </p>
      </div>
    </div>
  )
}
