import { createClient } from '@supabase/supabase-js'

/**
 * Create a cookie-less Supabase client for public data fetching.
 * Enables ISR/static generation (no request-time cookies needed).
 */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface PublicProfile {
  username: string
  display_name: string
  avatar_url: string | null
  joined_at: string
  lessons_completed: number
}

/**
 * Fetch a public profile by username slug.
 * Reads the anon-safe `public_profiles` view, which only contains rows where
 * is_public = true — so private/hidden profiles resolve to null (→ 404).
 */
export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('public_profiles')
    .select('username, display_name, avatar_url, joined_at, lessons_completed')
    .eq('username', username)
    .maybeSingle()

  if (error || !data) return null

  return data as PublicProfile
}
