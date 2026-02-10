import { createClient } from '@supabase/supabase-js'
import { slugToNameVariations } from './courseUtils'
import type { Course, Coach } from '@/types/course'

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
 * Fetch a single course by URL slug.
 * Tries exact match with name variations, then falls back to fuzzy search.
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = getSupabase()
  const nameVariations = slugToNameVariations(slug)

  // Try exact match with name variations
  const { data } = await supabase
    .from('courses')
    .select('*')
    .in('name', nameVariations)
    .in('status', ['live', 'coming_soon'])
    .limit(1)
    .maybeSingle()

  if (data) return data as Course

  // Fallback to fuzzy search
  const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ')
  const { data: fuzzyResult } = await supabase
    .from('courses')
    .select('*')
    .ilike('name', `%${normalizedSlug}%`)
    .in('status', ['live', 'coming_soon'])
    .limit(1)
    .maybeSingle()

  return (fuzzyResult as Course) || null
}

/**
 * Fetch active coaches for a course by URL slug.
 */
export async function getCoachesByCourseSlug(slug: string): Promise<Coach[]> {
  const supabase = getSupabase()
  const nameVariations = slugToNameVariations(slug)

  const { data } = await supabase
    .from('coaches')
    .select('*')
    .in('course_id', nameVariations)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (data as Coach[]) || []
}

/**
 * Fetch all course slugs for generateStaticParams.
 */
export async function getAllCourseSlugs(): Promise<string[]> {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('courses')
    .select('name')
    .in('status', ['live', 'coming_soon'])

  return data?.map((c: { name: string }) => c.name.toLowerCase().replace(/\s+/g, '-')) || []
}
