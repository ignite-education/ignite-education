import { createBrowserClient } from '@supabase/ssr'

// Explicit cookie handlers to ensure domain=.ignite.education is always set.
// cookieOptions.domain alone does not reliably set the domain attribute on cookies.
function getAll() {
  if (typeof document === 'undefined') return []
  return document.cookie.split('; ').filter(Boolean).map(c => {
    const [name, ...rest] = c.split('=')
    return { name, value: rest.join('=') }
  })
}

function setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
  if (typeof document === 'undefined') return
  cookiesToSet.forEach(({ name, value, options }) => {
    const parts = [`${name}=${value}`]
    parts.push(`path=${(options?.path as string) || '/'}`)
    parts.push('domain=.ignite.education')
    if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`)
    if (options?.sameSite) parts.push(`samesite=${options.sameSite}`)
    if (options?.secure !== false) parts.push('secure')
    document.cookie = parts.join('; ')
  })
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll, setAll },
    }
  )
}
