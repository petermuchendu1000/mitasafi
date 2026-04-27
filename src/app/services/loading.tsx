/**
 * Services Landing Page Loading Skeleton
 *
 * Instant navigation feedback for /services while the page
 * server component fetches data.
 */

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-teal-600 to-teal-700 px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="h-12 w-[28rem] max-w-full bg-teal-500/40 rounded-lg mx-auto mb-4" />
          <div className="h-6 w-96 max-w-full bg-teal-500/30 rounded mx-auto mb-8" />
          <div className="h-14 w-full max-w-xl bg-teal-500/20 rounded-xl mx-auto" />
        </div>
      </section>

      {/* Categories grid skeleton */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-3" />
              <div className="h-5 w-24 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
            </div>
          ))}
        </div>
      </section>

      {/* Featured providers skeleton */}
      <section className="bg-gray-50 px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-56 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-3/4 bg-gray-200 rounded" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                  <div className="h-8 w-28 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA skeleton */}
      <section className="px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="h-8 w-80 max-w-full bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-5 w-64 bg-gray-200 rounded mx-auto mb-6" />
          <div className="h-12 w-44 bg-gray-200 rounded-xl mx-auto" />
        </div>
      </section>
    </div>
  );
}
