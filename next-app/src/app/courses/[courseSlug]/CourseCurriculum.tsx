import { generateModuleIntro } from '@/lib/courseUtils'
import type { Module } from '@/types/course'
import EnrollmentCTA from './EnrollmentCTA'

interface CourseCurriculumProps {
  moduleStructure: Module[]
  structureType?: 'modules_and_lessons' | 'lessons_only'
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}

export default function CourseCurriculum({
  moduleStructure,
  structureType,
  courseSlug,
  courseTitle,
  isComingSoon,
}: CourseCurriculumProps) {
  if (!moduleStructure || moduleStructure.length === 0) {
    return null
  }

  const isLessonsOnly = structureType === 'lessons_only'
  const lessons = isLessonsOnly ? (moduleStructure[0]?.lessons || []) : []

  return (
    <div className="mb-8 lg:-mx-24 curriculum-section">
      <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
        Curriculum
      </h2>
      <div className="flex gap-6 items-stretch">
        {/* Left Column - Curriculum Content */}
        <div className="bg-[#F0F0F2] p-6 rounded-lg flex-1">
          <div className="space-y-6">
            {isLessonsOnly ? (
              lessons.map((lesson, lessonIndex) => (
                <div key={lessonIndex}>
                  <h3
                    className="font-semibold mb-1"
                    style={{ fontSize: '18px', color: '#7714E0', letterSpacing: '-0.01em' }}
                  >
                    {lesson.name}
                  </h3>

                  <div>
                    {lesson.description && (
                      <p className="text-gray-900 mb-3 font-light" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                        {lesson.description}
                      </p>
                    )}

                    {lesson.bullet_points && lesson.bullet_points.length > 0 && (
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '0.4rem' }}>
                        {lesson.bullet_points.map((point, pointIndex) => (
                          <li key={pointIndex} className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
                            <span className="text-gray-900" style={{ fontSize: '0.5em' }}>&#9632;</span>
                            <span className="font-medium text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            ) : (
              moduleStructure.map((module, moduleIndex) => (
                <div key={moduleIndex}>
                  <h3
                    className="font-semibold mb-1"
                    style={{ fontSize: '18px', color: '#7714E0', letterSpacing: '-0.01em' }}
                  >
                    Module {moduleIndex + 1} - {module.name}
                  </h3>

                  <div>
                    <p className="text-gray-900 mb-3 font-light" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                      {module.description || generateModuleIntro(module)}
                    </p>

                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '0.4rem' }}>
                      {(module.lessons || []).map((lesson, lessonIndex) => (
                        <li key={lessonIndex} className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
                          <span className="text-gray-900" style={{ fontSize: '0.5em' }}>&#9632;</span>
                          <span className="font-medium text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                            {lesson.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Sticky CTA (hidden on mobile) */}
        <div className="flex-shrink-0 hidden lg:block self-stretch" style={{ width: '315px' }}>
          <div className="sticky top-24">
            <EnrollmentCTA
              courseSlug={courseSlug}
              courseTitle={courseTitle}
              isComingSoon={isComingSoon}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
