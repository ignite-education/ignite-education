import type { Coach } from '@/types/course'
import CourseLeaderModal from './CourseLeaderModal'
import CoachAvailability from './CoachAvailability'

interface CourseLeadersProps {
  coaches: Coach[]
  courseTitle: string
}

export default function CourseLeaders({ coaches, courseTitle }: CourseLeadersProps) {
  return (
    <div className="mt-11 md:mt-9 mb-8">
      <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
        Course Leaders
      </h2>
      <div className="flex flex-col gap-4">
        {coaches.map((coach) => {
          const content = (
            <>
              <CoachAvailability
                courseId={coach.course_id}
                imageUrl={coach.image_url}
                coachName={coach.name}
                coachPosition={coach.position}
              />
              <div className="flex-1 min-w-0">
                <h4
                  className="font-medium text-gray-900 group-hover:text-[#EF0B72] transition-colors"
                  style={{ fontSize: '1.1rem', lineHeight: '1.3', marginBottom: '2px', letterSpacing: '-0.01em' }}
                >
                  {coach.name}
                </h4>
                {coach.position && (
                  <p className="text-gray-900 font-medium" style={{ fontSize: '1rem', lineHeight: '1.3', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                    {coach.position}
                  </p>
                )}
                {coach.description && (
                  <p className="text-gray-900 font-light" style={{ fontSize: '1rem', lineHeight: '1.5', textWrap: 'balance' }}>
                    {coach.description}
                  </p>
                )}
              </div>
            </>
          )

          return (
            <div key={coach.id} className="flex gap-4 items-center group cursor-pointer">
              {coach.linkedin_url ? (
                <a
                  href={coach.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-7 items-center flex-1"
                >
                  {content}
                </a>
              ) : (
                <div className="flex gap-7 items-center flex-1">
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
