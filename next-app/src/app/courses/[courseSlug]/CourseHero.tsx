import { getCourseTypeLabel, getCourseTagline, getTwoSentences } from '@/lib/courseUtils'
import type { Course } from '@/types/course'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import EnrollmentCTA from './EnrollmentCTA'

interface CourseHeroProps {
  course: Course
  courseSlug: string
  isComingSoon: boolean
}

export default function CourseHero({ course, courseSlug, isComingSoon }: CourseHeroProps) {
  return (
    <>
      <div className="sticky top-0 z-50">
        <Navbar variant="black" />
      </div>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-6 pb-[38px] flex justify-center pt-10 md:pt-[75px]">
          <div className="w-full text-center" style={{ maxWidth: '700px' }}>
            {/* Category Tag */}
            <Link
              href="/courses"
              className="inline-block px-[11px] py-[6px] text-sm text-black bg-[#F0F0F0] rounded-[6px] font-normal mb-6 md:mb-[30px]"
              style={{ letterSpacing: '-0.01em' }}
            >
              {getCourseTypeLabel(course)}
            </Link>

            {/* Title */}
            <h1
              className="text-[2rem] md:text-[38px] font-bold text-black mb-[15px] leading-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              {course.title}
            </h1>

            {/* Tagline */}
            <p
              className="text-xl text-[#7714E0] font-semibold leading-relaxed"
              style={{ letterSpacing: '-0.02em', marginBottom: '17px', textWrap: 'balance' }}
            >
              {getCourseTagline(course)}
            </p>

            {/* Description */}
            <p
              className="text-black text-[1.1rem] md:text-lg leading-normal md:leading-relaxed font-light course-description px-4 md:px-0 mb-2 md:mb-[30px]"
              style={{ letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              {getTwoSentences(course.description)}
            </p>

            {/* Course Benefits */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  <img src="https://auth.ignite.education/storage/v1/object/public/assets/Untitled%20folder/Gemini_Generated_Image_a4zn8wa4zn8wa4zn.png" alt="Certificate" className="w-[85px] h-[85px] md:w-[100px] md:h-[100px] object-contain" />
                </div>
                <span className="text-sm text-black leading-tight font-medium" style={{ letterSpacing: '-0.02em' }}>
                  Certificate upon<br />completion
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  <img src="https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_20fn7520fn7520fn.png" alt="Industry experts" className="w-[85px] h-[85px] md:w-[100px] md:h-[100px] object-contain" />
                </div>
                <span className="text-sm text-black leading-tight font-medium" style={{ letterSpacing: '-0.02em' }}>
                  Built by<br />industry experts
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  <img src="https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_mkil8emkil8emkil.png" alt="Self-paced learning" className="w-[85px] h-[85px] md:w-[100px] md:h-[100px] object-contain" />
                </div>
                <span className="text-sm text-black leading-tight font-medium" style={{ letterSpacing: '-0.02em' }}>
                  Self-paced<br />learning
                </span>
              </div>
            </div>

            {/* Mobile CTA (hidden on desktop where sidebar CTA shows) */}
            <div className="lg:hidden">
              <EnrollmentCTA
                courseSlug={courseSlug}
                courseTitle={course.title}
                isComingSoon={isComingSoon}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
