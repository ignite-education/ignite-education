import { getCoursesByType } from './courseData'
import { slugToNameVariations } from './courseUtils'
import type { Course } from '@/types/course'

export function professionToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function pluraliseProfession(name: string): string {
  if (name.endsWith('s')) return name
  return name + 's'
}

export async function getProfessionBySlug(slug: string): Promise<Course | null> {
  const coursesByType = await getCoursesByType()
  const nameVariations = slugToNameVariations(slug)

  return coursesByType.specialism.find(course => {
    const courseName = (course.title || course.name).toLowerCase()
    return nameVariations.some(v => v.toLowerCase() === courseName)
  }) || null
}

export async function getAllProfessionSlugs(): Promise<string[]> {
  const coursesByType = await getCoursesByType()
  return coursesByType.specialism.map(c => professionToSlug(c.title || c.name))
}
