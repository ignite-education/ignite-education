import CourseCard from './CourseCard'

export const COURSE_TYPE_CONFIG: Record<string, { title: string; description: string }> = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that\nenable you to enter a new career',
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that\nyou can immediately apply',
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to\nlearn anything you want',
  },
}

interface CourseTypeColumnProps {
  type: string
  courses: Array<{ id?: string; name: string; title?: string }>
  showDescription?: boolean
  maxCourses?: number
}

export default function CourseTypeColumn({
  type,
  courses,
  showDescription = true,
  maxCourses,
}: CourseTypeColumnProps) {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses

  return (
    <div className="flex flex-col">
      <h2
        className="text-[22px] font-bold text-[#EF0B72] mb-1 text-center tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
      >
        {config.title}
      </h2>
      {showDescription && (
        <p
          className="text-black text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          {config.description}
        </p>
      )}
      <div className="space-y-3">
        {displayCourses.map((course) => (
          <CourseCard key={course.id || course.name} course={course} />
        ))}
      </div>
    </div>
  )
}
