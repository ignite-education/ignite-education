import { useState } from 'react';

const ASSETS = 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/';

/* Same four stickers as the course page's HeroSticker. Duplicated rather than
   imported: that component lives in next-app, a separate Vercel project and
   build, and this repo copies across app boundaries rather than symlinking (see
   the shared libs in admin-app). Keep the two lists in step.

   width/height are the artwork's true pixel dimensions. */
const STICKERS = [
  { file: 'sticker-slow-dopamine.png', width: 752, height: 496, alt: 'Slow Dopamine — Ignite' },
  { file: 'sticker-15-minutes.png', width: 1007, height: 489, alt: 'The power of 15 minutes — Ignite' },
  { file: 'sticker-brainrot-know-a-lot.png', width: 836, height: 514, alt: 'Brainrot to Know-a-lot — Ignite' },
  { file: 'sticker-cultivate-curiosity.png', width: 842, height: 496, alt: 'Cultivate Curiosity — Ignite' },
];

/* One factor for all four rather than a per-sticker width. The cards differ in
   width because the wordmarks do, so a shared scale is what keeps type rendering
   at the same size whichever one is drawn, and keeps their heights in step —
   they land within 89-94px of each other here. 163/762 is the course page's
   scale; this hub runs 15% under it. Retune by moving the 0.85 alone. */
const SCALE = (163 / 762) * 0.85;

/**
 * One of the four stickers, at a random tilt, straddling the seam between the
 * white IntroSection and the black CourseDetailsSection.
 *
 * Picked in a useState initialiser rather than an effect: this app is a
 * client-rendered SPA with no server pass, so there is no hydration to match and
 * the sticker can be correct on its first paint. (The course page's equivalent
 * has to defer to an effect because that page is statically prerendered.)
 *
 * Renders its own zero-height positioning context, so dropping it between the
 * two sections costs neither of them any layout.
 */
export default function SeamSticker() {
  const [pick] = useState(() => ({
    index: Math.floor(Math.random() * STICKERS.length),
    // Sign then magnitude, rather than a single span across zero: it keeps the
    // tilt out of (-2, 2), where the card reads as a failed attempt at straight
    // rather than as deliberately askew. Matches the course page's sticker.
    angle: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2),
  }));

  const sticker = STICKERS[pick.index];

  return (
    /* h-0 so this sits exactly on the boundary and adds no height of its own.
       z-10 to paint over the black section, which follows in normal flow.
       Desktop only, as on the course page: centred on a narrow viewport the card
       would land on top of the course title just below the seam. */
    <div className="hidden lg:block relative h-0 z-10">
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {/* Tilt gets its own element: it must stay off the wrapper above, where
            Tailwind composes rotate-* and the centring translate-* utilities
            into a single transform, and off the image below, where a transform
            alongside the filter makes Chrome rasterise the drop-shadow in
            pre-transform space and render it clipped until a full re-raster. */}
        <div style={{ transform: `rotate(${pick.angle.toFixed(2)}deg)` }}>
          <img
            src={ASSETS + sticker.file}
            alt={sticker.alt}
            width={sticker.width}
            height={sticker.height}
            style={{
              width: `${Math.round(sticker.width * SCALE)}px`,
              height: 'auto',
              display: 'block',
              /* Literal rather than a token: this app has no --btn-glow-light,
                 and states its glows inline (see SignIn, GoogleOneTap). Value
                 matches the course page's sticker exactly. */
              filter: 'drop-shadow(0 0 10px rgba(103, 103, 103, 0.3))',
            }}
          />
        </div>
      </div>
    </div>
  );
}
