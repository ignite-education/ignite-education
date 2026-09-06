import { permanentRedirect } from 'next/navigation'

/**
 * Only ever reached by a direct hit on next.ignite.education — the apex root is
 * redirected by vercel.json before it gets here.
 *
 * permanentRedirect (308), not redirect (307): a temporary redirect tells Google
 * to keep the *source* URL indexed, which is exactly how `/` and `/welcome` ended
 * up as competing homepage candidates. Every hop in the chain stays permanent.
 */
export default function Home() {
  permanentRedirect('/welcome')
}
