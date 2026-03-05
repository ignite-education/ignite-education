import { createClient } from '@supabase/supabase-js'

export type Prompt = {
  id: string
  title: string
  description: string
  fullPrompt: string
  profession: string
  llmTools: string[]
  complexity: 'Low' | 'Mid' | 'High'
  usageCount: number
  rating: number
  createdAt: string
  updatedAt: string
  slug: string
  status?: 'published' | 'pending'
  authorName?: string
  authorImage?: string
  authorTitle?: string
  authorLinkedin?: string
}

export const LLM_TOOLS = ['Claude', 'Co-Pilot', 'ChatGPT', 'Gemini'] as const

export const COMPLEXITIES = ['Low', 'Mid', 'High'] as const

/**
 * Cookie-less Supabase client for server-side fetching (ISR/SSG).
 */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Service-role Supabase client that bypasses RLS.
 * Used for fetching draft prompts server-side (e.g. contributor preview).
 */
function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return getSupabase()
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export function promptToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Map DB snake_case row to frontend camelCase Prompt */
function mapDbPrompt(row: Record<string, unknown>): Prompt {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    fullPrompt: row.full_prompt as string,
    profession: row.profession as string,
    llmTools: row.llm_tools as string[],
    complexity: row.complexity as 'Low' | 'Mid' | 'High',
    usageCount: Math.max(row.usage_count as number, (row.real_usage_count as number) || 0),
    rating: Math.max(row.rating as number, (row.real_thumbs_up as number) || 0),
    createdAt: (row.created_at as string).split('T')[0],
    updatedAt: (row.updated_at as string).split('T')[0],
    slug: row.slug as string,
    status: (row.status as 'published' | 'pending') || 'published',
    authorName: (row.author_name as string) || undefined,
    authorImage: (row.author_image as string) || undefined,
    authorTitle: (row.author_title as string) || undefined,
    authorLinkedin: (row.author_linkedin as string) || undefined,
  }
}

/** Fetch all published prompts from Supabase */
export async function getAllPrompts(): Promise<Prompt[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching prompts:', error)
    return []
  }

  return (data || []).map(mapDbPrompt)
}

/** Fetch a single prompt by slug (includes draft prompts for direct URL access) */
export async function getPromptBySlug(slug: string): Promise<Prompt | undefined> {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('slug', slug)
    .in('status', ['published', 'draft'])
    .maybeSingle()

  if (error || !data) return undefined
  return mapDbPrompt(data)
}

/** Fetch all prompt slugs for generateStaticParams */
export async function getAllPromptSlugs(): Promise<string[]> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('prompts')
    .select('slug')
    .eq('status', 'published')

  return data?.map((p: { slug: string }) => p.slug) || []
}

// Backward compat: empty array for any remaining direct imports
export const placeholderPrompts: Prompt[] = []
