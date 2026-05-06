import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-5 w-6 rounded-full" />
            </div>
            {[1, 2, 3].map(j => (
              <div key={j} className="rounded-xl bg-card p-4 space-y-2 border border-border">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))}
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
