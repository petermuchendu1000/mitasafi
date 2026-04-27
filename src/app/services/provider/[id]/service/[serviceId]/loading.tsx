/**
 * Service Detail Page — Loading Skeleton
 *
 * Matches the Fiverr-style layout: image gallery + sidebar price card.
 */

export default function ServiceDetailLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Nav skeleton */}
      <div className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-32 hidden sm:block" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:flex lg:gap-10">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Image gallery */}
            <div className="aspect-[16/10] bg-gray-200 rounded-xl" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-20 h-14 bg-gray-200 rounded-lg flex-shrink-0" />
              ))}
            </div>

            {/* Title */}
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded w-32" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-48" />
              </div>
            </div>

            {/* Description */}
            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-36" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>

            {/* Service details */}
            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
            {/* Price card */}
            <div className="rounded-xl border border-gray-200 p-6">
              <div className="h-9 bg-gray-200 rounded w-32 mb-5" />
              <div className="h-12 bg-gray-200 rounded-lg mb-3" />
              <div className="h-12 bg-gray-200 rounded-lg" />
            </div>
            {/* Provider card */}
            <div className="rounded-xl border border-gray-200 p-6">
              <div className="h-4 bg-gray-200 rounded w-28 mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
