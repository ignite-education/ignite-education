'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

/**
 * Thin grey bar carrying the Trustpilot lockup — "Excellent", the 4.5-star
 * rating, then the brandmark, in Trustpilot's own order. Sits at
 * the very top of the document and drops down two seconds after mount, so the
 * page opens on the headline and the rating arrives as a second beat.
 *
 * No bottom border: the fill alone separates it from the hero's white.
 * Height comes from the padding, which is what to change if the bar needs to
 * be thicker or thinner — the assets themselves are sized by width.
 *
 * In normal flow, above <main>, so opening it pushes the whole page down
 * rather than painting over the hero. The 0fr -> 1fr grid-template-rows
 * transition is what makes that animatable: height alone cannot transition to
 * `auto`, and this avoids hard-coding a pixel height that would drift the
 * moment the asset widths change across the md breakpoint.
 *
 * The inner translateY runs on the same curve and duration, so the bar's
 * bottom edge tracks the opening clip edge exactly — it reads as the bar being
 * pulled down out from under the top edge rather than being uncovered in
 * place.
 */
const EASE = '1.2s cubic-bezier(0.22, 1, 0.36, 1)'

/** Trustpilot green, and the hover shade. */
const GREEN = 'fill-[#00B67A] transition-[fill] duration-200 group-hover:fill-[#009663]'

/** One 96x96 tile's star, in tile-local coordinates. */
const STAR_PATH =
  'M48,64.7 L62.6,61 L68.7,79.8 L48,64.7 Z M81.6,40.4 L55.9,40.4 L48,16.2 L40.1,40.4 L14.4,40.4 L35.2,55.4 L27.3,79.6 L48.1,64.6 L60.9,55.4 L81.6,40.4 Z'

/** Tile x-offsets: 96px tiles on a 104px pitch, so 8px of gap between them. */
const TILES = [0, 104, 208, 312, 416]

/**
 * The 4.5-star rating, transcribed from the official
 * Trustpilot_ratings_4halfstar-RGB asset in the Supabase bucket.
 *
 * Inline rather than an <img> so the green can be darkened on hover while the
 * star glyphs stay pure white — a CSS filter on the remote image cannot do
 * that, it dims every colour including the white. Being inline also means it
 * paints with the bar rather than needing its own request.
 */
function TrustpilotRating({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 96" role="img" aria-label="4.5 out of 5 stars" className={className}>
      {/* Four full tiles, then the half tile: grey right half laid down first,
          green left half over it. */}
      {TILES.slice(0, 4).map((x) => (
        <rect key={x} x={x} y={0} width={96} height={96} className={GREEN} />
      ))}
      <rect x={464} y={0} width={48} height={96} fill="#DCDCE6" />
      <rect x={416} y={0} width={48} height={96} className={GREEN} />
      {TILES.map((x) => (
        <path key={x} d={STAR_PATH} transform={`translate(${x} 0)`} fill="#FFFFFF" />
      ))}
    </svg>
  )
}

export default function TrustpilotBar() {
  const [isDown, setIsDown] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsDown(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: isDown ? '1fr' : '0fr',
        transition: `grid-template-rows ${EASE}`,
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        <div
          className="flex items-center justify-center bg-[#f4f4f5] py-[12px]"
          style={{
            transform: isDown ? 'translateY(0)' : 'translateY(-100%)',
            transition: `transform ${EASE}`,
          }}
        >
          {/* `group` on the lockup, not on the bar: hovering the word, the
              stars or the brandmark drops the underline and deepens the green,
              but the empty grey either side of it does not. */}
          <div className="group inline-flex items-center gap-[11px] md:gap-[13px]">
            {/* Trustpilot's own lockup order: rating word, stars, brandmark.
                The word is live text rather than an image so it stays crisp and
                stays readable to screen readers ahead of the star label. */}
            <span
              className="font-medium text-black text-[13px] md:text-[14px] leading-none tracking-[-0.01em] underline decoration-[1px] underline-offset-[3px] group-hover:no-underline"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              Excellent
            </span>
            <TrustpilotRating className="w-[76px] md:w-[90px] h-auto" />
            {/* priority: the bar starts at zero height, so Next's default lazy
                loading would not fetch this until the row opens and it would
                pop in after the slide. Served from Supabase like every other
                image on the public pages — next-app/public is not reachable
                from ignite.education, which serves these pages through a
                Vercel rewrite. */}
            <Image
              src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Trustpilot_brandmark_gr-blk_RGB-576x144-XL.png"
              alt="Trustpilot"
              width={576}
              height={144}
              priority
              className="w-[58px] md:w-[70px] h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
