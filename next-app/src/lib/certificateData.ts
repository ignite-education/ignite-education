import { createClient } from '@supabase/supabase-js'
import type { Certificate } from '@/types/certificate'

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

/**
 * Fetch a certificate by its UUID primary key.
 */
export async function getCertificateById(id: string): Promise<Certificate | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('certificates')
    .select('id, user_id, course_id, course_name, certificate_number, user_name, issued_date')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return data as Certificate
}
