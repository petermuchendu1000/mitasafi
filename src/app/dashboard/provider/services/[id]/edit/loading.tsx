export default function EditServiceLoading() {
  return (
    <div className="p-6 max-w-2xl animate-pulse space-y-8">
      {/* Back link */}
      <div>
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>

      {/* Pricing section */}
      <div className="space-y-4">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg border-2 border-gray-200" />
          ))}
        </div>
        <div className="h-10 w-48 bg-gray-100 rounded-lg" />
      </div>

      {/* Description */}
      <div className="space-y-3">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200" />
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="pt-2 border-t border-gray-100">
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
