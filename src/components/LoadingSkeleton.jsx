export default function LoadingSkeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-surface-container ${className}`} />
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-[2/3] rounded-2xl bg-surface-container animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-surface-container animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-surface-container animate-pulse" />
    </div>
  );
}

export function MovieGridSkeleton({ count = 8 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
