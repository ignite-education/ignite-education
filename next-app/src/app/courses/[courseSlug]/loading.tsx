export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar + hero share one black band, matching CourseHero */}
      <div className="bg-black">
        {/* Navbar skeleton */}
        <div className="sticky top-0 z-50 bg-black">
          <div className="px-10 py-[15px] flex items-center justify-between">
            <div className="w-[99px] h-[30px] bg-white/10 animate-pulse rounded" />
            <div className="w-[85px] h-[35px] bg-white/10 animate-pulse rounded" />
          </div>
        </div>

        {/* Hero skeleton */}
        {/* Top padding mirrors CourseHero so the skeleton does not jump. */}
        <div className="max-w-4xl mx-auto px-6 flex justify-center pt-[25px] md:pt-[60px]">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <div className="lg:-mx-24 pb-[38px] flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                {/* Category tag */}
                <div className="w-24 h-6 bg-white/10 animate-pulse rounded mb-8" />
                {/* Title */}
                <div className="h-12 bg-white/10 animate-pulse rounded w-3/4 mb-4" />
                {/* Tagline */}
                <div className="h-7 bg-white/10 animate-pulse rounded max-w-[508px] mb-2" />
                {/* Description */}
                <div className="h-14 bg-white/10 animate-pulse rounded max-w-[508px] mb-8" />
              </div>
              {/* Enrollment rail skeleton — mirrors the CTA's two buttons,
                  caption and share row rather than a card. */}
              {/* mt-14 clears the tag bar above, so the first button bar starts
                  level with the title bar — matching EnrollmentRail. */}
              <div className="flex-shrink-0 hidden lg:block mt-14" style={{ width: '315px' }}>
                <div className="w-[85%] mx-auto space-y-2">
                  <div className="h-10 bg-white/10 animate-pulse rounded-[0.65rem]" />
                  <div className="h-10 bg-white/10 animate-pulse rounded-[0.65rem]" />
                </div>
                <div className="h-5 w-2/3 mx-auto mt-4 bg-white/10 animate-pulse rounded" />
                <div className="h-[30px] w-[104px] mx-auto mt-3 bg-white/10 animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum skeleton */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-12 flex justify-center">
        <div className="w-full" style={{ maxWidth: '762px' }}>
          <div className="lg:-mx-24">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-40 mb-4" />
            <div className="bg-gray-100 rounded-lg p-6">
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="h-5 bg-gray-200 animate-pulse rounded w-2/3 mb-2" />
                    <div className="h-12 bg-gray-200 animate-pulse rounded w-full mb-3" />
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-2/5" />
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
