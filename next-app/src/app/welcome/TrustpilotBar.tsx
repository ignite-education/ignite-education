import Image from 'next/image'

/**
 * Thin grey bar carrying the Trustpilot lockup — "Excellent", the 4.5-star
 * rating, then the brandmark, in Trustpilot's own order. Sits at the very top
 * of the document, present from first paint: no mount delay, no slide-down, so
 * the page opens with the rating already in place.
 *
 * No bottom border: the fill alone separates it from the hero's white.
 * Height comes from the padding, which is what to change if the bar needs to
 * be thicker or thinner — the assets themselves are sized by width. Mobile
 * runs 15% taller than desktop's band: the lockup is the same size, the
 * padding absorbs the difference.
 *
 * In normal flow, above <main>, so it occupies its own band rather than
 * painting over the hero. Nothing here is stateful, so it stays a server
 * component and ships in the SSR HTML with no client JS behind it — the hover
 * treatment is pure CSS.
 */

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
  return (
    <div className="group flex items-center justify-center bg-[#f4f4f5] py-[14.9px] md:py-[12px]">
      {/* `group` sits on the full-width grey bar above, not here: anywhere in
          the strip drops the underline and deepens the green, so the hover
          target is the whole band rather than just the lockup. */}
      <div className="inline-flex items-center gap-[11px] md:gap-[13px]">
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
        {/* priority: this is the topmost element on the page, so it should be
            fetched with the hero rather than lazily. Served from Supabase like
            every other image on the public pages — next-app/public is not
            reachable from ignite.education, which serves these pages through a
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
  )
}
