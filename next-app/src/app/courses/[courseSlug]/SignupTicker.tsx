'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * ⚠️ PLACEHOLDER DATA — NOT REAL USERS, AND NO REAL EVENT BACKS THESE.
 *
 * Nobody named here started a course. This exists so the popup's design can be
 * tuned; it asserts something untrue to visitors and must be replaced with a
 * real source before being treated as social proof.
 *
 * Deliberately invented rather than taken from the real public profiles in
 * public/sitemap.xml — attaching real people to fabricated events would be
 * worse than inventing both.
 *
 * Format: first name + last initial.
 */
const PLACEHOLDER_NAMES = [
  'Sarah M.',
  'James T.',
  'Priya R.',
  'Daniel O.',
  'Amelia K.',
  'Tomasz W.',
  'Grace A.',
  'Callum B.',
  'Nadia H.',
  'Oliver P.',
  'Yusuf E.',
  'Freya L.',
]

/** Wait before the first appearance so it does not compete with the hero. */
const FIRST_APPEARANCE_MS = 4000
/** Fade in / fade out duration. */
const FADE_MS = 400
/** How long a name stays fully visible between its fade in and fade out. */
const VISIBLE_MS = 5000
/** Random empty gap after one name leaves and before the next arrives. */
const MIN_GAP_MS = 4000
const MAX_GAP_MS = 10000

export default function SignupTicker() {
  // Deterministic on the server and on first client render: picking randomly
  // here would make the two disagree and trip a hydration mismatch. Every
  // random choice happens inside the effect, after hydration.
  const [index, setIndex] = useState(0)
  // Stays mounted at opacity 0 from the first render rather than being added to
  // the tree when it is due. A CSS transition needs a previously-painted value
  // to animate from, so mounting straight in at opacity 1 made the very first
  // appearance snap while every later one faded. Harmless to keep in the DOM:
  // it is aria-hidden, pointer-events-none and fully transparent until shown.
  const [shown, setShown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // The reduced-motion block in globals.css neutralises CSS transitions but
    // cannot stop a timer, so the cycle has to be gated here. Show one static
    // name instead.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // Sequential chain rather than setInterval: the steps have different
    // durations and one of them is random. Always clears before rescheduling.
    const after = (ms: number, fn: () => void) => {
      clear()
      timerRef.current = setTimeout(fn, ms)
    }

    // fade in -> hold -> fade out -> empty for a random gap -> next name
    const runCycle = () => {
      setShown(true)
      after(FADE_MS + VISIBLE_MS, () => {
        setShown(false)
        // FADE_MS lets the fade-out finish before the gap is even counted, so
        // the gap is genuinely empty screen time rather than overlapping it.
        after(FADE_MS + MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS), () => {
          setIndex((prev) => (prev + 1) % PLACEHOLDER_NAMES.length)
          runCycle()
        })
      })
    }

    after(FIRST_APPEARANCE_MS, () => {
      // Vary the starting name so every visit does not open on the same one.
      // Safe now: this runs after hydration.
      setIndex(Math.floor(Math.random() * PLACEHOLDER_NAMES.length))
      if (prefersReducedMotion) {
        setShown(true)
        return
      }
      runCycle()
    })

    return clear
  }, [])

  return (
    /* aria-hidden: decorative marketing that conveys nothing essential. Without
       it, a name appearing every few seconds would repeatedly interrupt
       screen-reader users. pointer-events-none so it can never eat a click.
       z-40 keeps it above page content but below the zIndex: 9999 modals.
       No visibility toggle needed to hide it between names — opacity 0 plus
       pointer-events-none already makes it invisible and inert, and toggling
       visibility would cut the fade-out short. */
    <div
      aria-hidden
      className="fixed bottom-6 right-6 z-40 hidden lg:block pointer-events-none"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      {/* Blur only — no fill, no radius, no shadow. backdrop-filter blurs
          strictly inside its own box, so on its own it would show a hard
          rectangular edge where the blur stops. The radial mask fades the layer
          out well before its bounds, leaving no visible border, and -inset-8
          keeps the fade outside the text so the text itself stays fully backed.
          Inline styles are not autoprefixed, hence the -webkit- twin. */}
      <div
        className="absolute -inset-8 backdrop-blur-md"
        style={{
          maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 70%)',
        }}
      />
      <p className="relative text-black text-sm" style={{ letterSpacing: '-0.01em' }}>
        {/* Inherits text-black from the parent; only the weight sets it apart. */}
        <span className="font-semibold">{PLACEHOLDER_NAMES[index]}</span>{' '}
        just started
      </p>
    </div>
  )
}
