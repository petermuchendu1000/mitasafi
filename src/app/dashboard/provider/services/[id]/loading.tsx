export default function ServicePreviewLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner skeleton */}
      <div className="sticky top-0 z-30 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/10 rounded-lg" />
            <div className="h-4 w-40 bg-white/10 rounded" />
          </div>
          <div className="h-8 w-20 bg-teal-700 rounded-lg" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="lg:flex lg:gap-8">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Breadcrumb */}
            <div className="h-4 w-56 bg-gray-200 rounded" />

            {/* Title */}
            <div className="h-8 w-80 bg-gray-200 rounded" />

            {/* Provider mini-bar */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>

            {/* Image */}
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="aspect-[16/10] bg-gray-200" />
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-3">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
            </div>
          </div>

          {/* Right column */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
              <div className="text-center pb-4 border-b border-gray-100">
                <div className="h-8 w-32 bg-gray-200 rounded mx-auto" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
              <div className="h-10 w-full bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
