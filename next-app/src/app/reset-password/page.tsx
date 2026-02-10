import { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Ignite Education password to regain access to your courses and learning progress.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://ignite.education/reset-password',
  },
  openGraph: {
    title: 'Reset Password | Ignite Education',
    description: 'Reset your Ignite Education password to regain access to your courses and learning progress.',
    url: 'https://ignite.education/reset-password',
    siteName: 'Ignite Education',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Reset Password | Ignite Education',
    description: 'Reset your Ignite Education password to regain access to your courses and learning progress.',
  },
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
