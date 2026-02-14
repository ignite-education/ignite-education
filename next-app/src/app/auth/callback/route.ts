import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRecord, addToResendAudience } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/courses'

  // Use explicit site URL to ensure redirects go to the public-facing domain
  // (ignite.education), not the Next.js server origin (next.ignite.education)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : null)
    || new URL(request.url).origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Ensure user record exists (idempotent — ignores duplicate key errors)
        const metadata = user.user_metadata || {}
        const firstName = metadata.first_name || metadata.given_name || metadata.full_name?.split(' ')[0] || ''
        const lastName = metadata.last_name || metadata.family_name || metadata.full_name?.split(' ').slice(1).join(' ') || ''
        await createUserRecord(supabase, user, firstName, lastName)

        // Add to Resend audience (non-blocking, safe for returning users)
        if (user.email) {
          addToResendAudience(user.email, firstName, lastName)
        }

        // Check enrollment status and role to decide redirect destination
        const { data } = await supabase
          .from('users')
          .select('enrolled_course, role')
          .eq('id', user.id)
          .maybeSingle()

        // Admin redirect: send admin/teacher to admin portal, students to welcome
        const redirectParam = searchParams.get('redirect')
        if (redirectParam === 'admin') {
          if (data?.role === 'admin' || data?.role === 'teacher') {
            return NextResponse.redirect('https://admin.ignite.education')
          }
          return NextResponse.redirect(`${origin}/welcome`)
        }

        const destination = data?.enrolled_course ? '/progress' : '/courses'
        return NextResponse.redirect(`${origin}${destination}`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect back to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth`)
}
