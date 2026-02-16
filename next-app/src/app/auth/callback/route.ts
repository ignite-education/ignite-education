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
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

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

        // For LinkedIn sign-ins, try to fetch a higher-res profile picture
        // LinkedIn OIDC returns ~100x100 thumbnails; the userinfo endpoint may provide a better URL
        const providerToken = sessionData?.session?.provider_token
        if (user.app_metadata?.provider === 'linkedin_oidc' && providerToken) {
          try {
            const linkedinRes = await fetch('https://api.linkedin.com/v2/userinfo', {
              headers: { Authorization: `Bearer ${providerToken}` },
            })
            if (linkedinRes.ok) {
              const profile = await linkedinRes.json()
              console.log('[LinkedIn] userinfo picture:', profile.picture)
              console.log('[LinkedIn] existing avatar_url:', metadata.avatar_url)
              console.log('[LinkedIn] existing picture:', metadata.picture)
              if (profile.picture && profile.picture !== metadata.avatar_url && profile.picture !== metadata.picture) {
                await supabase.auth.updateUser({ data: { avatar_url: profile.picture } })
                console.log('[LinkedIn] Updated avatar_url to userinfo picture')
              } else {
                console.log('[LinkedIn] userinfo picture is same as existing — no update')
              }
            } else {
              console.error('[LinkedIn] userinfo request failed:', linkedinRes.status, await linkedinRes.text())
            }
          } catch (e) {
            // Non-critical — continue with default OIDC picture
            console.error('[LinkedIn] profile picture fetch failed:', e)
          }
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
