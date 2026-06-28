'use client'

import Lottie from 'lottie-react'
import lottieData from '../../../public/icon-animation.json'

/**
 * Animated Ignite flame logo — same asset + 61x61 sizing as the progress page
 * hero (src/components/ProgressHubV2/sections/IntroSection.jsx). Client-only
 * because lottie-react renders on the canvas; the rest of the hero stays
 * server-rendered for SEO.
 */
export default function ProfileLogo() {
  return <Lottie animationData={lottieData} loop autoplay style={{ width: 61, height: 61 }} />
}
