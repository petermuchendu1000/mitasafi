/**
 * Booking Request Page Loading Skeleton
 *
 * Instant navigation feedback for /services/provider/[id]/request
 * while auth + provider data resolves server-side.
 */

export default function RequestLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Nav skeleton */}
      <nav className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      </nav>

      {/* Form skeleton */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Provider info card */}
        <div className="flex items-center gap-4 mb-8 p-4 border border-gray-200 rounded-xl">
          <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-28 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full ${i === 0 ? "bg-teal-200" : "bg-gray-200"}`} />
              {i < 3 && <div className="h-0.5 w-8 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Form fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-24 w-full bg-gray-100 rounded-lg" />
          </div>
          <div className="h-12 w-full bg-gray-200 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
