'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const ASSETS =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/'

/* width/height are the artwork's true pixel dimensions, cropped to the card so
   next/image gets a correct aspect ratio. The wordmarks differ in length, so the
   cards differ in width — but every `css` width below is its source width times
   the same 163/762 factor inherited from the single sticker these replaced. One
   shared scale is what keeps type rendering at the same size across the set;
   sizing them all to an identical width instead would shrink the longer cards'
   text. Card heights land within 105–110px as a result, so the amount of sticker
   sitting either side of the seam stays even whichever one is drawn. */
const STICKERS = [
  { file: 'sticker-slow-dopamine.png', width: 752, height: 496, css: 161, alt: 'Slow Dopamine — Ignite' },
  { file: 'sticker-15-minutes.png', width: 1007, height: 489, css: 215, alt: 'The power of 15 minutes — Ignite' },
  { file: 'sticker-brainrot-know-a-lot.png', width: 836, height: 514, css: 179, alt: 'Brainrot to Know-a-lot — Ignite' },
  { file: 'sticker-cultivate-curiosity.png', width: 842, height: 496, css: 180, alt: 'Cultivate Curiosity — Ignite' },
]

/**
 * Draws one of the four hero stickers at random, per visit.
 *
 * The pick has to happen on the client. The course page is statically rendered
 * with a 1h revalidate, so choosing on the server would bake one sticker into
 * the cached HTML and serve that same one to everybody until the next
 * revalidation — random once an hour, not random per visitor.
 *
 * Starting at null and choosing in an effect keeps the server render and the
 * first client render identical, so there is no hydration mismatch. It means the
 * sticker appears a beat after hydration rather than in the initial HTML, which
 * costs nothing here: it is decorative, and its container is absolutely
 * positioned, so nothing reflows when it lands.
 */
export default function HeroSticker() {
  const [pick, setPick] = useState<{ index: number; angle: number } | null>(null)

  useEffect(() => {
    setPick({
      index: Math.floor(Math.random() * STICKERS.length),
      // Tilt is randomised with the artwork so a repeat sticker still looks
      // freshly stuck on. See the render below for which element carries it.
      // Sign then magnitude, rather than a single span across zero: it keeps the
      // tilt out of (-2, 2), where the card reads as a failed attempt at
      // straight rather than as deliberately askew.
      angle: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2),
    })
  }, [])

  if (pick === null) return null

  const sticker = STICKERS[pick.index]

  return (
    /* The tilt sits on its own element, one layer in from the positioned wrapper
       and one out from the image. It cannot go on the wrapper (Tailwind composes
       rotate-* and the centring translate-* utilities there into one transform,
       so an inline rotate would drop the centring), and it must not go on the
       image itself: a filter and a transform on the same element make Chrome
       rasterise the drop-shadow into a texture sized in pre-transform space, and
       that texture is not always regenerated when the image finishes decoding —
       the shadow renders visibly clipped until something forces a full re-raster,
       which is why zooming appeared to fix it. */
    <div style={{ transform: `rotate(${pick.angle.toFixed(2)}deg)` }}>
      <Image
        src={ASSETS + sticker.file}
        alt={sticker.alt}
        width={sticker.width}
        height={sticker.height}
        /* eager, not the default lazy: this only mounts once we have already
           decided to show it, so deferring the fetch buys nothing and leaves the
           filtered element painting empty for a frame — the same stale-raster
           window described above. */
        loading="eager"
        /* drop-shadow, not box-shadow: the artwork has rounded, stepped edges with
           transparent corners, and box-shadow would trace a rectangle around them.
           Reuses the same token as the sign-in buttons over the light band, so the
           two cannot drift apart. */
        style={{
          width: `${sticker.css}px`,
          height: 'auto',
          filter: 'drop-shadow(var(--btn-glow-light))',
        }}
      />
    </div>
  )
}
