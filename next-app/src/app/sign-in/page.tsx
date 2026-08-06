import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignInForm from './SignInForm'
import { OG_DEFAULTS, ogImages } from '@/lib/siteConfig'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Ignite Education to access your courses. New to Ignite? Create a free account to start learning.',
  // An auth form has no query value and competes with nothing. Keep it
  // crawlable (follow) so it still passes equity, but out of the index.
  robots: { index: false, follow: true },
  alternates: {
    canonical: '/sign-in',
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Sign In | Ignite Education',
    description: 'Sign in to Ignite Education to access your courses. New to Ignite? Create a free account to start learning.',
    url: '/sign-in',
    images: ogImages(),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ogImages(),
    title: 'Sign In | Ignite Education',
    description: 'Sign in to Ignite Education to access your courses.',
  },
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  // When fresh=true, skip the auth check and always show the sign-in form.
  // This allows users with stale cookies (wrong domain) to re-authenticate
  // and get new cookies with domain=.ignite.education for cross-subdomain sharing.
  const forceFresh = params.fresh === 'true'

  const supabase = await createClient()
  let user = null
  if (!forceFresh) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Corrupted session cookie — treat as unauthenticated and show sign-in form
    }
  }

  if (user) {
    const redirectParam = typeof params.redirect === 'string' ? params.redirect : undefined

    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (redirectParam === 'admin') {
      if (data?.role === 'admin' || data?.role === 'teacher') {
        redirect('https://admin.ignite.education')
      }
      redirect('/welcome')
    }

    // Unconditional: /progress serves users with and without an enrolled course.
    redirect('/progress')
  }

  return <SignInForm />
}
