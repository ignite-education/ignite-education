import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file:\n' +
    '- VITE_SUPABASE_URL should be set to your Supabase project URL\n' +
    '- VITE_SUPABASE_ANON_KEY should be set to your Supabase anon key'
  )
}

// Check for placeholder values
if (
  supabaseUrl.includes('your-project') ||
  supabaseUrl.includes('your_project') ||
  supabaseAnonKey.includes('your_supabase') ||
  supabaseAnonKey === 'your_supabase_anon_key'
) {
  throw new Error(
    'Supabase credentials are still using placeholder values. Please update your .env file with actual credentials from your Supabase dashboard.\n\n' +
    'Current values:\n' +
    `- VITE_SUPABASE_URL: ${supabaseUrl}\n` +
    `- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...\n\n` +
    'Get your credentials from: https://supabase.com/dashboard → Project Settings → API'
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

const isLocalDev = import.meta.env.DEV && window.location.hostname === 'localhost'

function setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    const parts = [`${name}=${value}`]
    parts.push(`path=${options?.path || '/'}`)
    if (!isLocalDev) parts.push('domain=.ignite.education')
    if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`)
    if (options?.sameSite) parts.push(`samesite=${options.sameSite}`)
    if (!isLocalDev && options?.secure !== false) parts.push('secure')
    document.cookie = parts.join('; ')
  })
}

// Use createBrowserClient from @supabase/ssr so the Vite SPA shares
// cookie-based auth storage with the Next.js app (both on ignite.education)
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

// One-time cleanup: remove stale Supabase auth tokens from localStorage
// (left over from pre-cookie migration when createClient used localStorage)
if (typeof window !== 'undefined') {
  try {
    const staleKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('sb-') && (key.endsWith('-auth-token') || key.includes('-auth-token.'))
    )
    if (staleKeys.length > 0) {
      staleKeys.forEach(key => localStorage.removeItem(key))
    }
  } catch {
    // Ignore localStorage errors (private browsing, etc.)
  }
}
