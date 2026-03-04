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
  slug: string
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
    usageCount: row.usage_count as number,
    rating: Number(row.rating),
    createdAt: (row.created_at as string).split('T')[0],
    slug: row.slug as string,
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

/** Fetch a single prompt by slug */
export async function getPromptBySlug(slug: string): Promise<Prompt | undefined> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
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
