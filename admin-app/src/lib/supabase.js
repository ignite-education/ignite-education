import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file:\n' +
    '- VITE_SUPABASE_URL should be set to your Supabase project URL\n' +
    '- VITE_SUPABASE_ANON_KEY should be set to your Supabase anon key'
  )
}

// Explicit cookie handlers to ensure domain=.ignite.education is always set.
// cookieOptions.domain alone does not reliably set the domain attribute on cookies.
function getAll() {
  return document.cookie.split('; ').filter(Boolean).map(c => {
    const [name, ...rest] = c.split('=')
    return { name, value: rest.join('=') }
  })
}

function setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    const parts = [`${name}=${value}`]
    parts.push(`path=${options?.path || '/'}`)
    parts.push('domain=.ignite.education')
    if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`)
    if (options?.sameSite) parts.push(`samesite=${options.sameSite}`)
    if (options?.secure !== false) parts.push('secure')
    document.cookie = parts.join('; ')
  })
}

// Use createBrowserClient from @supabase/ssr so the admin app shares
// cookie-based auth storage with the main Vite SPA and Next.js app
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
  cookies: { getAll, setAll },
})
