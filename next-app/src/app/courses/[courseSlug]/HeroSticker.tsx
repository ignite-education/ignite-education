'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const ASSETS =
  'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/'

/* width/height are the artwork's true pixel dimensions, cropped to the card so
   next/image gets a correct aspect ratio. The wordmarks differ in length, so the
   cards differ in width — but every `css` width below is its source width times
   the same (163/762) × 0.85 factor: the scale inherited from the single sticker
   these replaced, trimmed 15%. One shared scale is what keeps type rendering at
   the same size across the set; sizing them all to an identical width instead
   would shrink the longer cards' text. Card heights land within 89–94px as a
   result, so the amount of sticker sitting either side of the seam stays even
   whichever one is drawn. Retune by moving the 0.85 and rounding each width.

   src/components/ProgressHubV2/SeamSticker.jsx in the sibling Vite app draws the
   same four cards at 95% of this scale — it kept its size when this one was
   trimmed, so the two are now close rather than clearly different. Keep the
   two lists in step — and read that file before changing how this one loads. The clipped-glow bug the gate
   below exists for was found and fixed there first, and it survived here only
   because nobody diffed the two. The gates are deliberately not identical: that
   app renders a plain <img>, so it can probe the URL with a throwaway Image()
   and render nothing until the probe decodes. This one goes through the image
   optimizer, so what paints is a /_next/image candidate and a probe of the
   Supabase original would decode a different resource and open the gate early. */
const STICKERS = [
  { file: 'sticker-slow-dopamine.png', width: 752, height: 496, css: 137, alt: 'Slow Dopamine — Ignite' },
  { file: 'sticker-15-minutes.png', width: 1007, height: 489, css: 183, alt: 'The power of 15 minutes — Ignite' },
  { file: 'sticker-brainrot-know-a-lot.png', width: 836, height: 514, css: 152, alt: 'Brainrot to Know-a-lot — Ignite' },
  { file: 'sticker-cultivate-curiosity.png', width: 842, height: 496, css: 153, alt: 'Cultivate Curiosity — Ignite' },
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

  /* Gate for the reveal — see the style block below for what it is protecting
     against. Driven by next/image's onLoad, which is not the raw load event:
     Next awaits the <img>'s own decode() and only then calls the handler (see
     handleLoading in next/dist/client/image-component.js). That is exactly the
     signal wanted here, and unlike a separate probe it is tied to whichever
     srcset candidate the browser actually chose. It also covers the cached path,
     where Next calls handleLoading itself off img.complete, and it still fires
     if decode() rejects, because Next swallows that first. */
  const [decoded, setDecoded] = useState(false)

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
       in CourseHero and one out from the image. It cannot move up to that
       wrapper: the angle is drawn here, after hydration, so there is nothing for
       a server-rendered utility class to say. (This used to claim a rotate-*
       utility there would clobber the centring translate-* ones by sharing a
       transform stack. That was never true under Tailwind v4, which emits
       standalone `rotate:` and `translate:` properties that compose
       independently — but the timing rules it out anyway.) And it must not move
       down onto the image: filters apply before transforms, so a transform there
       makes Chrome rasterise the drop-shadow in pre-transform space and then
       resample it, which is one more way for the glow to come out wrong on the
       one element whose entire history is the glow coming out wrong. */
    <div style={{ transform: `rotate(${pick.angle.toFixed(2)}deg)` }}>
      <Image
        src={ASSETS + sticker.file}
        alt={sticker.alt}
        width={sticker.width}
        height={sticker.height}
        /* eager, not the default lazy: this only mounts once we have already
           decided to show it, and the gate above already holds the card back
           until its bitmap has decoded, so deferring the fetch buys nothing and
           only pushes that moment further out. */
        loading="eager"
        /* Both open the gate. onError covers a request that failed outright,
           where visible alt text beats a card stranded invisible forever. */
        onLoad={() => setDecoded(true)}
        onError={() => setDecoded(true)}
        style={{
          /* Both axes in px rather than height:auto. The same number auto would
             resolve to — left fractional on purpose, since CourseHero anchors
             this card by its bottom edge and rounding would shift it off the
             seam — but stated up front, so the box can never change size
             underneath the filter. */
          width: `${sticker.css}px`,
          height: `${(sticker.css * sticker.height) / sticker.width}px`,
          /* Tailwind's preflight already does this to every img. Repeated inline
             so the box stays exactly W×H, with no line-box slack under it, even
             if that base rule ever moves. */
          display: 'block',
          /* Its own compositing layer, declared from the first render rather
             than alongside the filter — will-change is a hint you give before
             the property changes, and a layer that already exists is one the
             glow can be rasterised straight into. Without it the sticker shares
             raster tiles with the black hero band above and the grey curriculum
             band below, and a tile edge is the hard straight line the shadow
             used to be cut off along. */
          willChange: 'filter',
          /* The fix, and it has to land as one commit. drop-shadow is a filter,
             and Chrome sizes the raster for a filtered element from what that
             element paints. An <img> whose bitmap has not arrived yet paints
             nothing, so the filter rasterises against an empty box and the glow
             comes out clipped — and the repaint on decode does not reliably
             re-expand those bounds, which is why a clipped shadow survived until
             some unrelated re-raster such as a browser zoom. Staying hidden
             until decoded means the element's first paint already has pixels in
             it, so the bounds are right the only time they are ever computed.
             The invariant to preserve if this is ever touched: the element never
             paints without its filter, and never carries a filter without its
             pixels. Cache hits resolve in a microtask, so this costs nothing on
             the common path.

             drop-shadow rather than box-shadow, separately: the artwork has
             rounded, stepped edges with transparent corners, and box-shadow
             would trace a rectangle around them. Reuses the same token as the
             sign-in buttons over the light band, so the two cannot drift. */
          visibility: decoded ? 'visible' : 'hidden',
          filter: decoded ? 'drop-shadow(var(--btn-glow-light))' : undefined,
        }}
      />
    </div>
  )
}
