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

export interface PublicProfileSlug {
  username: string
  joined_at: string
}

/**
 * Every indexable profile slug, for the sitemap.
 *
 * Same `public_profiles` view as the page itself, so an is_public = false user
 * drops out of both together (ISR-stale up to an hour) and the sitemap can
 * never advertise a URL that 404s.
 *
 * PostgREST caps a single response at its max-rows setting (1000 by default),
 * so this pages explicitly rather than silently truncating once signups pass
 * that mark. `joined_at` is the only date the view exposes — profiles have no
 * updated_at — so it serves as lastModified.
 */
export async function getAllPublicProfiles(): Promise<PublicProfileSlug[]> {
  const supabase = getSupabase()
  const PAGE_SIZE = 1000
  const all: PublicProfileSlug[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('username, joined_at')
      .order('joined_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('Error fetching public profiles for sitemap:', error)
      break
    }
    if (!data?.length) break

    all.push(...(data as PublicProfileSlug[]))
    if (data.length < PAGE_SIZE) break
  }

  return all
}
