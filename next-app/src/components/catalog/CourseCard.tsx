import Link from 'next/link'

interface CourseCardProps {
  course: {
    id?: string
    name: string
    title?: string
  }
  /** Open the course in a new tab. Used on public profiles, where the catalog
   *  is secondary content and leaving the page would lose the profile. */
  openInNewTab?: boolean
}

export default function CourseCard({ course, openInNewTab = false }: CourseCardProps) {
  const slug = course.name?.toLowerCase().replace(/\s+/g, '-')
    || course.title?.toLowerCase().replace(/\s+/g, '-')

  return (
    <Link
      href={`/courses/${slug}`}
      {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group block bg-[#F6F6F6] rounded-[8px] px-5 py-3"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-black font-semibold tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          {course.title || course.name}
        </span>
        <div
          className="bg-white rounded-md flex items-center justify-center"
          style={{ width: '35px', height: '35px' }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#D8D8D8] group-hover:text-[#EF0B72] transition-colors"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
