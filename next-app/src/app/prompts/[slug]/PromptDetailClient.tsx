'use client'

import { useState } from 'react'

interface PromptDetailClientProps {
  fullPrompt: string
}

export default function PromptDetailClient({ fullPrompt }: PromptDetailClientProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = fullPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
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
  )
}
