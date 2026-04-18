export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-muted" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded-md bg-muted" />
              <div className="h-8 w-8 rounded-xl bg-muted" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted" />
            <div className="h-3 w-32 rounded-md bg-muted" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-5 space-y-4">
          <div className="h-5 w-40 rounded-md bg-muted" />
          <div className="h-56 w-full rounded-xl bg-muted" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
          <div className="h-5 w-32 rounded-md bg-muted" />
          <div className="h-56 w-full rounded-xl bg-muted" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
        <div className="h-5 w-36 rounded-md bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
              <div className="h-4 rounded-md bg-muted" style={{ width: `${[60, 80, 45, 70, 55][i]}%` }} />
              <div className="h-4 w-16 rounded-md bg-muted ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
