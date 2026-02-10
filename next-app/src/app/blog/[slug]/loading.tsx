export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navbar skeleton */}
      <div className="px-10 py-[15px] flex items-center justify-between">
        <div className="w-[99px] h-[30px] bg-gray-800 animate-pulse rounded" />
        <div className="w-[85px] h-[35px] bg-gray-800 animate-pulse rounded" />
      </div>

      {/* Hero skeleton */}
      <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
        <div className="w-full" style={{ maxWidth: '762px' }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7">
            <div className="w-4 h-4 bg-gray-700 animate-pulse rounded" />
            <div className="w-3 h-3 bg-gray-700 animate-pulse" />
            <div className="w-12 h-4 bg-gray-700 animate-pulse rounded" />
            <div className="w-3 h-3 bg-gray-700 animate-pulse" />
            <div className="w-32 h-4 bg-gray-700 animate-pulse rounded" />
          </div>
          {/* Title */}
          <div className="h-12 bg-gray-700 animate-pulse rounded w-3/4 mb-3.5" />
          <div className="h-12 bg-gray-700 animate-pulse rounded w-1/2 mb-3.5" />
          {/* Excerpt */}
          <div className="h-7 bg-gray-700 animate-pulse rounded w-full mb-2" />
          <div className="h-7 bg-gray-700 animate-pulse rounded w-2/3" />
        </div>
      </div>

      {/* Featured image skeleton */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-black" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white" />
        <div className="relative max-w-4xl mx-auto px-6 flex justify-center">
          <div className="w-full rounded-lg overflow-hidden" style={{ maxWidth: '762px' }}>
            <div className="w-full h-[400px] bg-gray-300 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16 flex justify-center">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <div className="space-y-4">
              <div className="h-5 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-3/4" />
              <div className="h-8 bg-gray-900 animate-pulse rounded w-1/3 mt-8" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-5/6" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-5 bg-gray-200 animate-pulse rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
