import { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'
import { brandTitle, ogImages } from '@/lib/siteConfig'

const TITLE = 'Reset Password'

export const metadata: Metadata = {
  title: TITLE,
  description: 'Reset your Ignite Education password to regain access to your courses and learning progress.',
  // follow:true so the page still passes equity onward; a canonical alongside
  // noindex was contradictory, so it's gone.
  robots: { index: false, follow: true },
  openGraph: {
    title: brandTitle(TITLE),
    description: 'Reset your Ignite Education password to regain access to your courses and learning progress.',
    url: '/reset-password',
    images: ogImages(),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ogImages(),
    title: brandTitle(TITLE),
    description: 'Reset your Ignite Education password to regain access to your courses and learning progress.',
  },
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
