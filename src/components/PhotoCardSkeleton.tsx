export const PhotoCardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
    <div className="w-full aspect-[4/3] bg-muted" />
    <div className="p-3 space-y-2">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="h-3 w-16 rounded bg-muted" />
    </div>
  </div>
);
