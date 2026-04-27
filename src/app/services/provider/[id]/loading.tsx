/**
 * Provider Detail Page — Loading Skeleton
 *
 * Full-page skeleton matching the detail page layout:
 * hero + sidebar + tabs.
 */

export default function ProviderDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-xl bg-gray-200 flex-shrink-0" />
            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="h-7 bg-gray-200 rounded w-60" />
              <div className="h-4 bg-gray-200 rounded w-80" />
              <div className="flex gap-3">
                <div className="h-5 bg-gray-200 rounded w-20" />
                <div className="h-5 bg-gray-200 rounded w-28" />
                <div className="h-5 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 space-y-6">
            <div className="h-5 bg-gray-200 rounded w-full" />
            <div className="h-5 bg-gray-200 rounded w-4/5" />
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            {/* Service cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-20 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Sidebar */}
          <div className="hidden lg:block w-80 space-y-4">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
