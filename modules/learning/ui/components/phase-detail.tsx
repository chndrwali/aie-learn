"use client";

import { Progress } from "@/components/ui/progress";
import { summarizeLessonStatuses } from "@/modules/learning/lib/progress";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LessonRow } from "./lesson-row";

/**
 * Isi halaman fase (FR-005): header fase + daftar materi urut dengan
 * status, badge jenis, bahasa, dan estimasi. Baris, bukan kartu.
 */
export function PhaseDetail({ phaseSlug }: { phaseSlug: string }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.catalog.phase.queryOptions({ phaseSlug }),
  );
  const { completed, total, percent } = summarizeLessonStatuses(
    data.lessons.map((lesson) => lesson.status),
  );

  return (
    <div>
      <p className="font-sans text-sm text-muted-foreground">
        Fase {data.phase.number}
      </p>
      <h1 className="mt-1 font-sans text-2xl font-semibold tracking-tight">
        {data.phase.title}
      </h1>
      {data.phase.tagline && (
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          {data.phase.tagline}
        </p>
      )}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-sans text-sm text-muted-foreground">
            {completed} dari {total} selesai
          </p>
          <span className="font-sans text-sm tabular-nums text-muted-foreground">
            {percent}%
          </span>
        </div>
        <Progress
          value={percent}
          aria-label={`Progres ${data.phase.title}: ${completed} dari ${total} selesai`}
          className="mt-2"
        />
      </div>
      {data.lessons.length === 0 ? (
        <p className="mt-6 font-sans text-sm text-muted-foreground">
          Fase ini belum punya materi aktif.
        </p>
      ) : (
        <ul className="mt-6 space-y-1">
          {data.lessons.map((lesson) => (
            <li key={lesson.id}>
              <LessonRow phaseSlug={phaseSlug} lesson={lesson} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
