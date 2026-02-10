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
})

// === DIAGNOSTIC LOGGING (temporary — remove after debugging) ===
if (typeof window !== 'undefined') {
  // 1. Log all sb-* cookies (names + value lengths only, not actual tokens)
  try {
    const allCookies = document.cookie.split(';').map(c => c.trim())
    const sbCookies = allCookies.filter(c => c.startsWith('sb-'))
    console.log('[Supabase Diag] sb-* cookies found:', sbCookies.length)
    sbCookies.forEach(c => {
      const eqIdx = c.indexOf('=')
      const name = c.substring(0, eqIdx)
      const value = c.substring(eqIdx + 1)
      console.log(`[Supabase Diag]   ${name} (${value.length} chars)`)
    })

    // 2. Check for PKCE code verifier cookies (could cause stale exchange)
    const pkceCookies = allCookies.filter(c => c.includes('code-verifier') || c.includes('code_verifier'))
    if (pkceCookies.length > 0) {
      console.warn('[Supabase Diag] PKCE code verifier cookies found!', pkceCookies.map(c => c.split('=')[0]))
    } else {
      console.log('[Supabase Diag] No PKCE code verifier cookies (good)')
    }

    // 3. Try to decode and check access token expiry from cookies
    const authTokenCookie = sbCookies.find(c => c.includes('-auth-token') && !c.includes('.'))
    if (authTokenCookie) {
      const value = authTokenCookie.substring(authTokenCookie.indexOf('=') + 1)
      try {
        // Cookie might be base64url-encoded JSON containing the access_token
        let decoded = value
        if (value.startsWith('base64-')) {
          decoded = atob(value.substring(7).replace(/-/g, '+').replace(/_/g, '/'))
        }
        const parsed = JSON.parse(decoded)
        if (parsed.access_token) {
          const payload = JSON.parse(atob(parsed.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          const exp = payload.exp * 1000
          const now = Date.now()
          console.log('[Supabase Diag] Access token exp:', new Date(exp).toISOString())
          console.log('[Supabase Diag] Current time:', new Date(now).toISOString())
          console.log('[Supabase Diag] Token expired?', now > exp, `(${Math.round((now - exp) / 1000)}s ${now > exp ? 'ago' : 'until'})`)
        }
      } catch (e) {
        console.log('[Supabase Diag] Could not parse access token from cookie:', e.message)
      }
    } else {
      // Check chunked cookies
      const chunkedCookies = sbCookies.filter(c => c.includes('-auth-token.'))
      if (chunkedCookies.length > 0) {
        console.log('[Supabase Diag] Auth token is chunked across', chunkedCookies.length, 'cookies')
      } else {
        console.warn('[Supabase Diag] No auth token cookie found at all!')
      }
    }
  } catch (e) {
    console.error('[Supabase Diag] Cookie inspection error:', e)
  }

  // 4. Raw fetch test — bypasses Supabase client entirely
  console.log('[Supabase Diag] Testing raw fetch to Supabase REST API...')
  const fetchStart = Date.now()
  fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    }
  }).then(r => {
    console.log(`[Supabase Diag] Raw fetch SUCCESS in ${Date.now() - fetchStart}ms, status: ${r.status}`)
  }).catch(e => {
    console.error(`[Supabase Diag] Raw fetch FAILED in ${Date.now() - fetchStart}ms:`, e.message)
  })

  // 5. One-time cleanup: remove stale Supabase auth tokens from localStorage
  try {
    const staleKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('sb-') && (key.endsWith('-auth-token') || key.includes('-auth-token.'))
    )
    if (staleKeys.length > 0) {
      console.log('[Supabase Diag] Cleaning up stale localStorage keys:', staleKeys)
      staleKeys.forEach(key => localStorage.removeItem(key))
    }
  } catch {
    // Ignore localStorage errors (private browsing, etc.)
  }
}
