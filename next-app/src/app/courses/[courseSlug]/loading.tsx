export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar skeleton */}
      <div className="px-10 py-[15px] flex items-center justify-between">
        <div className="w-[99px] h-[30px] bg-gray-200 animate-pulse rounded" />
        <div className="w-[85px] h-[35px] bg-gray-200 animate-pulse rounded" />
      </div>

      {/* Hero skeleton */}
      <div className="max-w-4xl mx-auto px-6 flex justify-center" style={{ paddingTop: '75px' }}>
        <div className="w-full text-center" style={{ maxWidth: '700px' }}>
          {/* Category tag */}
          <div className="w-24 h-6 bg-gray-200 animate-pulse rounded mx-auto mb-8" />
          {/* Title */}
          <div className="h-12 bg-gray-200 animate-pulse rounded w-3/4 mx-auto mb-4" />
          {/* Tagline */}
          <div className="h-7 bg-gray-200 animate-pulse rounded w-2/3 mx-auto mb-2" />
          {/* Description */}
          <div className="h-14 bg-gray-200 animate-pulse rounded w-full mx-auto mb-8" />
          {/* Benefits */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="h-16 bg-gray-200 animate-pulse rounded" />
            <div className="h-16 bg-gray-200 animate-pulse rounded" />
            <div className="h-16 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Curriculum skeleton */}
      <div className="max-w-4xl mx-auto px-6 pb-12 flex justify-center">
        <div className="w-full" style={{ maxWidth: '762px' }}>
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
  )
}
