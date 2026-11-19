"use client";

import { Progress } from "@/components/ui/progress";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

/** Progres total di dashboard (FR-009): selesai ÷ materi aktif. */
export function TotalProgress() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.progress.overview.queryOptions());
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-sm font-semibold">Progres total</h2>
        <span className="font-sans text-sm tabular-nums text-muted-foreground">
          {data.percent}%
        </span>
      </div>
      <Progress
        value={data.percent}
        aria-label={`Progres total: ${data.completed} dari ${data.totalLessons} selesai`}
        className="mt-2"
      />
      <p className="mt-1.5 font-sans text-sm text-muted-foreground">
        {data.completed} dari {data.totalLessons} selesai
      </p>
    </div>
  );
}
