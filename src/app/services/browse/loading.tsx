/**
 * Browse Page Loading Skeleton
 *
 * Instant navigation feedback for /services/browse while the page
 * server component fetches data. Shows hero skeleton + grid skeleton.
 */

export default function BrowseLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-b from-teal-600 to-teal-700 px-4 py-12">
        <div className="max-w-5xl mx-auto text-center">
          <div className="h-10 w-96 max-w-full bg-teal-500/40 rounded-lg mx-auto mb-4" />
          <div className="h-5 w-72 max-w-full bg-teal-500/30 rounded mx-auto mb-8" />
          <div className="h-12 w-full max-w-xl bg-teal-500/20 rounded-xl mx-auto" />
        </div>
      </div>

      {/* Category quick nav skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="h-9 rounded-full bg-gray-200"
              style={{ width: `${70 + (i % 3) * 20}px` }}
            />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex gap-6">
          {/* Sidebar skeleton (hidden on mobile) */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            <div className="h-8 w-40 bg-gray-200 rounded" />
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded" style={{ width: `${60 + (i % 4) * 10}%` }} />
              ))}
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-9 w-40 bg-gray-200 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="h-40 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-3/4 bg-gray-200 rounded" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-200 rounded-full" />
                      <div className="h-6 w-20 bg-gray-200 rounded-full" />
                    </div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
