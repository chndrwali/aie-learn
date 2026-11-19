import { Skeleton } from "@/components/ui/skeleton";

/** Loading dashboard (front-end-flow.md): skeleton kartu + baris. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-44 w-full rounded-xl" />
      <Skeleton className="mt-8 h-4 w-32" />
      <Skeleton className="mt-2 h-2 w-full" />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
