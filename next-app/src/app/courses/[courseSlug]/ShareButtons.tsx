'use client'

import { useState } from 'react'

interface ShareButtonsProps {
  courseSlug: string
  courseTitle: string
}

export default function ShareButtons({ courseSlug, courseTitle }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `https://ignite.education/courses/${courseSlug}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleLinkedInShare = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  const handleWhatsAppShare = () => {
    const text = `Check out this course: ${courseTitle} on Ignite Education`
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
      '_blank'
    )
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Share this course</h4>
      <div className="flex gap-2">
        <button
          onClick={handleCopyLink}
          className="flex-1 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={handleLinkedInShare}
          className="flex-1 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition"
        >
          LinkedIn
        </button>
        <button
          onClick={handleWhatsAppShare}
          className="flex-1 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition"
        >
          WhatsApp
        </button>
      </div>
    </div>
  )
}
