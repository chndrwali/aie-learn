import { Skeleton } from "@/components/ui/skeleton";

/** Loading halaman fase: skeleton header + daftar. */
export default function PhaseLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-2 h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mt-4 h-2 w-full" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
