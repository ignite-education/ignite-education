import { createClient } from '@supabase/supabase-js'
import type { BlogPost, BlogPostAudio } from '@/types/blog'

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
 * Fetch a single published blog post by slug.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`Error fetching blog post "${slug}":`, error)
    }
    return null
  }

  return data as BlogPost | null
}

/**
 * Fetch pre-generated audio data for a blog post.
 */
export async function getAudioByPostId(postId: string): Promise<BlogPostAudio | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('blog_post_audio')
    .select('*')
    .eq('blog_post_id', postId)
    .maybeSingle()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching blog post audio:', error)
    }
    return null
  }

  return data as BlogPostAudio | null
}

/**
 * Fetch all published blog post slugs for generateStaticParams.
 */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published')

  return data?.map((p: { slug: string }) => p.slug) || []
}

/**
 * Fetch recent published posts for carousel display.
 */
export async function getRecentPosts(limit: number = 5): Promise<BlogPost[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent posts:', error)
    return []
  }

  return (data as BlogPost[]) || []
}
