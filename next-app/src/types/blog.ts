export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  featured_image: string | null
  featured_video: string | null
  author_name: string
  author_role: string | null
  author_avatar: string | null
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  status: 'draft' | 'published' | 'archived'
  published_at: string
  created_at: string
  updated_at: string
}

export interface BlogPostAudio {
  id: string
  blog_post_id: string
  audio_url: string
  word_timestamps: WordTimestamp[]
  duration_seconds: number
  content_hash: string
}

export interface WordTimestamp {
  word: string
  start: number
  end: number
  index: number
}
