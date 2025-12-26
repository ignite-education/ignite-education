import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom storage adapter that handles OAuth redirects in Chrome
// Uses sessionStorage for tab isolation, but checks localStorage for OAuth callback data
const createHybridStorage = () => {
  const isOAuthCallback = () => {
    // Check if this is an OAuth callback (has auth tokens in URL hash or query params)
    const hash = window.location.hash
    const search = window.location.search
    return hash.includes('access_token') ||
           hash.includes('refresh_token') ||
           search.includes('code=') ||
           hash.includes('error=')
  }

  return {
    getItem: (key) => {
      // First try sessionStorage (primary storage)
      const sessionValue = sessionStorage.getItem(key)
      if (sessionValue) {
        return sessionValue
      }

      // During OAuth callback, also check localStorage (Chrome may have put it there)
      if (isOAuthCallback()) {
        const localValue = localStorage.getItem(key)
        if (localValue) {
          // Move to sessionStorage and clean up localStorage
          sessionStorage.setItem(key, localValue)
          localStorage.removeItem(key)
          return localValue
        }
      }

      return null
    },
    setItem: (key, value) => {
      // Always write to sessionStorage
      sessionStorage.setItem(key, value)

      // During OAuth callback, also write to localStorage as backup for Chrome
      if (isOAuthCallback()) {
        localStorage.setItem(key, value)
      }
    },
    removeItem: (key) => {
      sessionStorage.removeItem(key)
      localStorage.removeItem(key) // Clean up any OAuth remnants
    }
  }
}

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: createHybridStorage(), // Hybrid storage: sessionStorage for tab isolation, localStorage for OAuth
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
})