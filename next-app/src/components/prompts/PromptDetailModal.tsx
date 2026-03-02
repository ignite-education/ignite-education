'use client'

import { useState, useEffect } from 'react'
import type { Prompt } from '@/data/placeholderPrompts'

interface PromptDetailModalProps {
  prompt: Prompt
  onClose: () => void
}

export default function PromptDetailModal({ prompt, onClose }: PromptDetailModalProps) {
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.fullPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = prompt.fullPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
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
        className={`relative bg-white flex flex-col ${closing ? 'animate-scaleDown' : 'animate-scaleUp'}`}
        style={{
          width: '90vw',
          maxWidth: '640px',
          maxHeight: '80vh',
          padding: '2rem 2.25rem',
          borderRadius: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title */}
        <h2
          className="text-[1.5rem] font-bold text-black tracking-[-0.02em] mb-2 pr-8"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          {prompt.title}
        </h2>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span
            className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
          >
            {prompt.profession}
          </span>
          {prompt.llmTools.map((tool) => (
            <span
              key={tool}
              className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
            >
              {tool}
            </span>
          ))}
          <span
            className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
          >
            {prompt.complexity}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-gray-600 text-sm leading-relaxed mb-4"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          {prompt.description}
        </p>

        {/* Prompt text */}
        <div
          className="flex-1 overflow-y-auto mb-4 rounded-lg"
          style={{
            backgroundColor: '#F8F8F8',
            padding: '1rem 1.25rem',
            border: '1px solid #E5E7EB',
          }}
        >
          <pre
            className="text-sm text-black whitespace-pre-wrap leading-relaxed"
            style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px' }}
          >
            {prompt.fullPrompt}
          </pre>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
          <span className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {prompt.usageCount.toLocaleString()} uses
          </span>
          <span className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {prompt.rating.toFixed(1)}
          </span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="w-full text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer text-sm"
          style={{
            backgroundColor: copied ? '#009600' : '#EF0B72',
            fontFamily: 'var(--font-geist-sans), sans-serif',
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.backgroundColor = '#D50A65'
          }}
          onMouseLeave={(e) => {
            if (!copied) e.currentTarget.style.backgroundColor = '#EF0B72'
          }}
        >
          {copied ? 'Copied to Clipboard' : 'Copy Prompt'}
        </button>
      </div>
    </div>
  )
}
