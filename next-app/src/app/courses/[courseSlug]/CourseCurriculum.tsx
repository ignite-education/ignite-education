import { generateModuleIntro } from '@/lib/courseUtils'
import type { Module } from '@/types/course'
import EnrollmentCTA from './EnrollmentCTA'
import CurriculumLessonSlider from './CurriculumLessonSlider'

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
    <div className="curriculum-section bg-[#F6F6F6]">
      {/* Full-bleed grey background; content stays at the original width */}
      <div className="max-w-4xl mx-auto px-6 py-8 md:py-10 flex justify-center">
        <div className="w-full" style={{ maxWidth: '762px' }}>
          <div className="lg:-mx-24">
            <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
              Content
            </h2>
            <div className="flex gap-6 items-stretch">
              {/* Left Column - Curriculum Content */}
              <div className="flex-1 min-w-0">
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

                        {lesson.description && (
                          <p className="text-gray-900 mb-3 font-light" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em', maxWidth: '85%' }}>
                            {lesson.description}
                          </p>
                        )}

                        <CurriculumLessonSlider
                          lessons={[lesson]}
                          moduleNumber={1}
                          baseLessonNumber={lessonIndex}
                          showCardTitle={false}
                          courseSlug={courseSlug}
                          courseTitle={courseTitle}
                          isComingSoon={isComingSoon}
                        />
                      </div>
                    ))
                  ) : (
                    moduleStructure.map((module, moduleIndex) => (
                      <div key={moduleIndex}>
                        <h3
                          className="font-semibold mb-1"
                          style={{ fontSize: '18px', color: '#7714E0', letterSpacing: '-0.01em' }}
                        >
                          {module.name}
                        </h3>

                        <div>
                          <p className="text-gray-900 mb-3 font-light" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                            {module.description || generateModuleIntro(module)}
                          </p>

                          <CurriculumLessonSlider
                            lessons={module.lessons || []}
                            moduleNumber={moduleIndex + 1}
                            courseSlug={courseSlug}
                            courseTitle={courseTitle}
                            isComingSoon={isComingSoon}
                          />
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
        </div>
      </div>
    </div>
  )
}
