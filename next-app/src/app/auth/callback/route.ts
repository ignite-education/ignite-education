import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect back to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth`)
}
