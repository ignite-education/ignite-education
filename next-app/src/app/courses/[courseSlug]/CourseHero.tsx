import { getCourseTypeLabel, getCourseTagline, getFirstSentence } from '@/lib/courseUtils'
import type { Course } from '@/types/course'
import Image from 'next/image'
import Link from 'next/link'
import EnrollmentCTA from './EnrollmentCTA'

interface CourseHeroProps {
  course: Course
  courseSlug: string
  isComingSoon: boolean
}

export default function CourseHero({ course, courseSlug, isComingSoon }: CourseHeroProps) {
  return (
    <>
      {/* data-course-hero: EnrollmentRail measures this band to centre itself
          and to find the black/grey boundary for its text clip. */}
      <div className="bg-black relative" data-course-hero>
        <div className="max-w-4xl mx-auto px-6 pb-[38px] flex justify-center pt-[25px] md:pt-[60px]">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            {/* Matches CourseCurriculum's grid so the hero shares its left edge */}
            <div className="lg:-mx-24 text-left">
              {/* Category Tag */}
              <Link
                href="/courses"
                className="inline-block px-[11px] py-[6px] text-sm text-black bg-white rounded-[4px] font-normal mb-[19px] md:mb-6"
                style={{ letterSpacing: '-0.01em' }}
              >
                {getCourseTypeLabel(course)}
              </Link>

              {/* Title. data-course-title: EnrollmentRail aligns its first
                  button's top edge to this element's top. */}
              <h1
                data-course-title
                className="text-[2rem] md:text-[40px] font-semibold text-white mb-[23px] leading-tight"
                style={{ letterSpacing: '-0.02em' }}
              >
                {course.title}
              </h1>

              {/* Tagline */}
              <p
                className="text-xl text-[#EF0B72] font-semibold leading-normal max-w-[508px]"
                style={{ letterSpacing: '-0.01em', marginBottom: '8px' }}
              >
                {getCourseTagline(course)}
              </p>

              {/* Description */}
              <p
                className="text-white text-[1.1rem] md:text-lg leading-normal md:leading-relaxed font-light course-description max-w-[508px] mb-10 md:mb-[30px]"
                style={{ letterSpacing: '-0.02em' }}
              >
                {getFirstSentence(course.description)}
              </p>

              {/* Trustpilot brandmark + rating. Official artwork, white
                  wordmark variant for the black band. unoptimized: the
                  optimizer rejects SVG unless dangerouslyAllowSVG is on. */}
              <div
                /* inline-flex retained deliberately: the lg gap below depends
                   on this element sitting in an inline line box. Below lg the
                   margin is the gap to the inline CTA; at lg the gap is the
                   band's padding plus whatever of this margin exceeds the
                   line-leading. */
                className="inline-flex items-center gap-2.5 mb-[63px] lg:mb-[31px]"
              >
                <Image
                  src="/images/trustpilot-logo-white.svg"
                  alt="Trustpilot"
                  width={1133}
                  height={278}
                  unoptimized
                  style={{ width: '91px', height: 'auto' }}
                />
                <Image
                  src="/images/trustpilot-rating-4halfstar.svg"
                  alt="4.5 out of 5 stars"
                  width={512}
                  height={96}
                  unoptimized
                  style={{ width: '118px', height: 'auto' }}
                />
              </div>

              {/* Mobile CTA (hidden on desktop where sidebar CTA shows) */}
              <div className="lg:hidden">
                <EnrollmentCTA
                  courseSlug={courseSlug}
                  courseTitle={course.title}
                  isComingSoon={isComingSoon}
                  onDark
                />
              </div>
            </div>
          </div>
        </div>

        {/* Badge straddling the seam between this band and the Content section:
            bottom-0 puts its lower edge on the seam, translate-y-1/2 pushes half
            of it into the section below. Desktop only. z-10 so it paints over
            the grey band, which follows in normal flow. The artwork is a white
            rounded card with transparent corners, so it stays legible across
            both bands. Absolutely positioned, so it does not change the band's
            height — EnrollmentRail measures that to align itself. */}
        {/* Offset right via ml-6 rather than left-[calc(50%+24px)]: the nudge is
            24px either way, but stock utilities are already present in any
            compiled CSS. An arbitrary-value class is newly generated, and if it
            is ever missing from a stale bundle `left` silently falls back to 0
            and dumps the sticker off the left edge instead of near centre. */}
        <div className="hidden lg:block absolute left-1/2 ml-6 bottom-0 -translate-x-1/2 translate-y-1/2 rotate-[5deg] z-10 pointer-events-none">
          <Image
            src="/images/slooow-dopamine.png"
            alt="Slooow Dopamine — Ignite"
            width={762}
            height={489}
            /* drop-shadow, not box-shadow: the artwork has rounded, stepped
               edges with transparent corners, and box-shadow would trace a
               rectangle around them. Reuses the same token as the sign-in
               buttons over the light band, so the two cannot drift apart. */
            style={{ width: '163px', height: 'auto', filter: 'drop-shadow(var(--btn-glow-light))' }}
          />
        </div>
      </div>
    </>
  )
}
