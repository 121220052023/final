import { Skeleton } from './ui/skeleton';

export function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3">
      <Skeleton className="h-16 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="border-b border-border/40 pb-6 mb-6">
      <div className="flex justify-between items-start mb-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-6 w-12 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8 mb-10">
          <Skeleton className="h-6 w-48 mb-8" />
          {[1, 2, 3].map(i => <ReviewSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <Skeleton className="h-6 w-40 mb-6" />
            {[1, 2, 3, 4, 5].map(i => <ListItemSkeleton key={i} />)}
          </div>
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <Skeleton className="h-6 w-40 mb-6" />
            {[1, 2, 3, 4, 5].map(i => <ListItemSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
