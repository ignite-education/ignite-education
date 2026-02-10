export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar skeleton */}
      <div className="px-10 py-[15px] flex items-center justify-between">
        <div className="w-[99px] h-[30px] bg-gray-200 animate-pulse rounded" />
        <div className="w-[85px] h-[35px] bg-gray-200 animate-pulse rounded" />
      </div>

      {/* Catalog skeleton */}
      <div className="py-12">
        <div className="max-w-[1267px] mx-auto px-6">
          {/* Logo placeholder */}
          <div className="text-center mb-[7px]">
            <div className="w-20 h-20 bg-pink-100 rounded mx-auto animate-pulse" style={{ marginBottom: '28.8px' }} />
            <div className="h-10 bg-gray-200 rounded w-80 mx-auto mb-[6px] animate-pulse" style={{ marginTop: '-12px' }} />
          </div>

          {/* Search skeleton */}
          <div className="mb-10">
            <div className="h-12 bg-gray-100 rounded-xl w-full max-w-[660px] mx-auto animate-pulse" />
          </div>

          {/* Three columns skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[35px]">
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex flex-col">
                <div className="h-7 bg-pink-200 rounded w-24 mx-auto mb-1 animate-pulse" />
                <div className="mb-6 min-h-[40px] flex flex-col items-center gap-1">
                  <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((card) => (
                    <div key={card} className="bg-[#F8F8F8] rounded-xl px-5 py-3 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-5 bg-gray-300 rounded w-3/4" />
                        <div className="bg-white rounded-md w-[35px] h-[35px]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
