import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Crawler/metadata endpoints that never need a session. Without this bail,
 * every sitemap, robots.txt and OG-image request pays for a Supabase
 * `updateSession` round-trip. The matcher below is a path prefix regex and
 * can't express the trailing "/opengraph-image" suffix, so it's checked here.
 */
function isPublicMetadataRoute(pathname: string): boolean {
  return (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/llms.txt' ||
    pathname.endsWith('/opengraph-image')
  )
}

export async function middleware(request: NextRequest) {
  if (isPublicMetadataRoute(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|welcome|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
