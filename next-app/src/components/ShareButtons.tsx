'use client'

import { useState } from 'react'

interface ShareButtonsProps {
  /** Absolute URL to share. */
  url: string
  /** Title passed to the Web Share sheet. */
  title: string
  /** Message body for WhatsApp; the URL is appended. Defaults to `title`. */
  shareText?: string
  /**
   * Set in the sticky rail, which crosses the black/grey boundary. The share
   * glyph is drawn twice and clipped at --clip-split so its colour changes with
   * the band behind it. Elsewhere the glyph inherits currentColor.
   */
  clip?: boolean
}

/**
 * The share row used by the course hero and the public profile hero: native
 * share (falling back to clipboard), LinkedIn, WhatsApp.
 *
 * Lives in components/ rather than a route folder because two routes use it —
 * the blog has its own separate variant with a different visual treatment.
 */
export default function ShareButtons({ url, title, shareText, clip }: ShareButtonsProps) {
  const [shareHovered, setShareHovered] = useState(false)

  const handleShare = async () => {
    const shareData = { title, url }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err)
      }
    } else {
      await navigator.clipboard.writeText(shareData.url)
    }
  }

  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  }

  // One definition so both clipped layers stay pixel-identical, including the
  // hover lift. Hover paints pink on both, so the split is invisible then.
  const shareGlyph = (baseColor: string) => {
    const stroke = shareHovered ? '#EF0B72' : baseColor
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g style={{ transition: 'transform 0.2s ease', transform: shareHovered ? 'translateY(-2px)' : 'translateY(0)' }}>
          <path
            d="M12 3v12M8 7l4-4 4 4"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'stroke 0.2s ease' }}
          />
        </g>
        <path
          d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
        />
      </svg>
    )
  }

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText || title} ${url}`)}`, '_blank')
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Share Button */}
      <div
        onClick={handleShare}
        onMouseEnter={() => setShareHovered(true)}
        onMouseLeave={() => setShareHovered(false)}
        className={`flex items-center justify-center rounded-[4px]${clip ? ' clip-stack' : ''}`}
        data-clip-split={clip ? '' : undefined}
        style={{ width: '33px', height: '33px', cursor: 'pointer' }}
        role="button"
        aria-label="Share"
      >
        {clip ? (
          <>
            <span className="clip-layer-dark">{shareGlyph('#FFFFFF')}</span>
            <span className="clip-layer-light" aria-hidden>{shareGlyph('#000000')}</span>
          </>
        ) : (
          shareGlyph('currentColor')
        )}
      </div>

      <div className="w-1" />

      {/* LinkedIn Share */}
      <button
        onClick={handleLinkedInShare}
        aria-label="Share on LinkedIn"
        className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#0A66C2] transition-shadow duration-350 ease-in-out hover:shadow-[0_0_10px_rgba(103,103,103,0.4)]"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      </button>

      {/* WhatsApp Share */}
      <button
        onClick={handleWhatsAppShare}
        aria-label="Share on WhatsApp"
        className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#25D366] transition-shadow duration-350 ease-in-out hover:shadow-[0_0_10px_rgba(103,103,103,0.4)]"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>

    </div>
  )
}
