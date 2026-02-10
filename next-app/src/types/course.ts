export interface Lesson {
  name: string
  description?: string
  bullet_points?: string[]
}

export interface Module {
  name: string
  description?: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  name: string
  title: string
  description: string
  status: 'live' | 'coming_soon'
  course_type: 'specialism' | 'skill' | 'subject'
  category: string
  image_url: string
  og_image?: string
  module_structure: Module[]
  display_order: number
  created_at: string
  updated_at: string
}

export interface Coach {
  id: string
  course_id: string
  name: string
  position: string
  description: string
  image_url: string
  linkedin_url?: string
  is_active: boolean
  display_order: number
}

export interface FAQ {
  question: string
  answer: string
}
