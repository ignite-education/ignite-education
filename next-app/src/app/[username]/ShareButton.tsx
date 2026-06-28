'use client'

import { useState } from 'react'

/**
 * Share icon ported from the progress page hero
 * (src/components/ProgressHubV2/sections/IntroSection.jsx ShareButton) — same
 * 29x29 hit area, 19x19 upload glyph, pink hover + arrow nudge. Shares the
 * public profile URL via the Web Share API, falling back to clipboard copy.
 */
export default function ShareButton({ url, title }: { url: string; title: string }) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const iconColor = hovered ? '#EF0B72' : '#000000'

  const handleShare = async () => {
    const shareData = { title, url }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch (err) {
        console.error('Copy failed:', err)
      }
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {copied && (
        <span
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: '11px',
            letterSpacing: '-0.01em',
            padding: '3px 7px',
            borderRadius: '4px',
          }}
        >
          Link copied
        </span>
      )}
      <div
        onClick={handleShare}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center justify-center rounded-[4px]"
        style={{ width: '29px', height: '29px', cursor: 'pointer' }}
        role="button"
        aria-label="Share profile"
        title="Share profile"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g style={{ transition: 'transform 0.2s ease', transform: hovered ? 'translateY(-2px)' : 'translateY(0)' }}>
            <path
              d="M12 3v12M8 7l4-4 4 4"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.2s ease' }}
            />
          </g>
          <path
            d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'stroke 0.2s ease' }}
          />
        </svg>
      </div>
    </div>
  )
}
