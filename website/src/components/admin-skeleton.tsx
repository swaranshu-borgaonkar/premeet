'use client';

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-24" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Header row */}
      <div className="border-b border-gray-100 px-6 py-3 flex gap-6">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
      {/* Body rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded w-28" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-40" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-4 bg-gray-100 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="w-5 h-5 bg-gray-100 rounded" />
          </div>
          <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
          <div className="flex items-center gap-4">
            <div className="h-4 bg-gray-100 rounded w-20" />
            <div className="h-4 bg-gray-100 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityListSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
