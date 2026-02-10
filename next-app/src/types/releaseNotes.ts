export interface ReleaseNote {
  id: string
  version: string
  release_date: string
  notes: string[]
  blog_url: string | null
  status: 'draft' | 'published'
}
