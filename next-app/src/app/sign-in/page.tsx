import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignInForm from './SignInForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Ignite Education to access your courses. New to Ignite? Create a free account to start learning.',
  keywords: 'sign in, login, ignite education, online courses, free courses',
  alternates: {
    canonical: 'https://ignite.education/sign-in',
  },
  openGraph: {
    title: 'Sign In | Ignite Education',
    description: 'Sign in to Ignite Education to access your courses. New to Ignite? Create a free account to start learning.',
    url: 'https://ignite.education/sign-in',
    siteName: 'Ignite Education',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sign In | Ignite Education',
    description: 'Sign in to Ignite Education to access your courses.',
  },
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const params = await searchParams
    const redirectParam = typeof params.redirect === 'string' ? params.redirect : undefined

    const { data } = await supabase
      .from('users')
      .select('enrolled_course, role')
      .eq('id', user.id)
      .maybeSingle()

    if (redirectParam === 'admin') {
      if (data?.role === 'admin' || data?.role === 'teacher') {
        redirect('https://admin.ignite.education')
      }
      redirect('/welcome')
    }

    redirect(data?.enrolled_course ? '/progress' : '/courses')
  }

  return <SignInForm />
}
