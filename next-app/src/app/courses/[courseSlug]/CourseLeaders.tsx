import Image from 'next/image'
import type { Coach } from '@/types/course'
import CourseLeaderModal from './CourseLeaderModal'

interface CourseLeadersProps {
  coaches: Coach[]
  courseTitle: string
}

export default function CourseLeaders({ coaches, courseTitle }: CourseLeadersProps) {
  return (
    <div className="mt-9 mb-8">
      <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
        Course Leaders
      </h2>
      <div className="flex flex-col gap-4">
        {coaches.map((coach) => {
          const content = (
            <>
              {coach.image_url ? (
                <Image
                  src={coach.image_url}
                  alt={`${coach.name}${coach.position ? `, ${coach.position}` : ''} - Course instructor at Ignite Education`}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded object-cover object-center flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded bg-gray-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4
                  className="font-semibold text-gray-900 group-hover:text-[#EF0B72] transition-colors"
                  style={{ fontSize: '15px', lineHeight: '1.3', marginBottom: '2px' }}
                >
                  {coach.name}
                </h4>
                {coach.position && (
                  <p className="text-gray-900 font-medium" style={{ fontSize: '15px', lineHeight: '1.3', marginBottom: '4px' }}>
                    {coach.position}
                  </p>
                )}
                {coach.description && (
                  <p className="text-gray-900" style={{ fontSize: '15px', lineHeight: '1.5' }}>
                    {coach.description}
                  </p>
                )}
              </div>
            </>
          )

          return (
            <div key={coach.id} className="flex gap-4 items-start group cursor-pointer">
              {coach.linkedin_url ? (
                <a
                  href={coach.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 items-start flex-1"
                >
                  {content}
                </a>
              ) : (
                <div className="flex gap-4 items-start flex-1">
                  {content}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <CourseLeaderModal courseTitle={courseTitle} />
    </div>
  )
}
