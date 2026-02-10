import { createClient } from '@supabase/supabase-js'
import type { ReleaseNote } from '@/types/releaseNotes'

/**
 * Create a cookie-less Supabase client for public data fetching.
 * This enables ISR/static generation (no request-time cookies needed).
 */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Fetch all published release notes, ordered by release date descending.
 */
export async function getPublishedReleases(): Promise<ReleaseNote[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('release_notes')
    .select('*')
    .eq('status', 'published')
    .order('release_date', { ascending: false })

  if (error) {
    console.error('Error fetching published releases:', error)
    return []
  }

  return data || []
}

/**
 * Format a release date for display (e.g. "2 November 2025").
 */
export function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
