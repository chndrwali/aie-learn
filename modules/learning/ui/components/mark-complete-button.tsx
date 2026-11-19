"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Check, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import type { FooterNavLesson } from "./lesson-footer-nav";
import type { LessonStatus } from "./progress-mark";

type RouterOutput = inferRouterOutputs<AppRouter>;

/**
 * Tombol selesai di footer materi (front-end-flow.md, MarkCompleteButton).
 *
 * Optimistic update: status materi langsung COMPLETED di cache
 * `lesson.syllabus` (+ hitungan `catalog.phases` dan status di
 * `catalog.phase`), tombol `disabled` selama `isPending` (klik ganda
 * tidak mengirim dua kali; server pun idempotent). Gagal jaringan →
 * snapshot dikembalikan + toast "Gagal menyimpan. Coba lagi.".
 * Sukses → toast "Ditandai selesai" lalu pindah ke materi berikutnya;
 * kalau ini materi terakhir fase, tampilkan ajakan kembali ke dashboard.
 * `onSettled` invalidate sesuai backend_flow.md.
 */
export function MarkCompleteButton({
  lessonId,
  phaseSlug,
  status: initialStatus,
  next,
  onMarkedLast,
  onUnmarked,
}: {
  lessonId: string;
  phaseSlug: string;
  status: LessonStatus;
  next: FooterNavLesson | null;
  onMarkedLast?: () => void;
  onUnmarked?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState<LessonStatus>(initialStatus);

  const syllabusKey = trpc.lesson.syllabus.queryOptions({
    phaseSlug,
  }).queryKey;
  const phasesKey = trpc.catalog.phases.queryOptions().queryKey;
  const phaseKey = trpc.catalog.phase.queryOptions({ phaseSlug }).queryKey;

  type Snapshot = {
    prevStatus: LessonStatus;
    syllabus: RouterOutput["lesson"]["syllabus"] | undefined;
    phases: RouterOutput["catalog"]["phases"] | undefined;
    phase: RouterOutput["catalog"]["phase"] | undefined;
  };

  async function cancelRelated() {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: syllabusKey }),
      queryClient.cancelQueries({ queryKey: phasesKey }),
      queryClient.cancelQueries({ queryKey: phaseKey }),
      queryClient.cancelQueries({
        queryKey: trpc.progress.overview.queryOptions().queryKey,
      }),
      queryClient.cancelQueries({
        queryKey: trpc.progress.continue.queryOptions().queryKey,
      }),
    ]);
  }

  function snapshot(prevStatus: LessonStatus): Snapshot {
    return {
      prevStatus,
      syllabus:
        queryClient.getQueryData<RouterOutput["lesson"]["syllabus"]>(
          syllabusKey,
        ),
      phases:
        queryClient.getQueryData<RouterOutput["catalog"]["phases"]>(phasesKey),
      phase:
        queryClient.getQueryData<RouterOutput["catalog"]["phase"]>(phaseKey),
    };
  }

  function applyOptimistic(target: LessonStatus, prevStatus: LessonStatus) {
    setStatus(target);
    queryClient.setQueryData<RouterOutput["lesson"]["syllabus"]>(
      syllabusKey,
      (old) =>
        old
          ? {
              ...old,
              lessons: old.lessons.map((l) =>
                l.id === lessonId ? { ...l, status: target } : l,
              ),
            }
          : old,
    );
    if (prevStatus !== target) {
      const delta = target === "COMPLETED" ? 1 : -1;
      queryClient.setQueryData<RouterOutput["catalog"]["phases"]>(
        phasesKey,
        (old) =>
          old
            ? old.map((p) =>
                p.slug === phaseSlug
                  ? { ...p, completedCount: p.completedCount + delta }
                  : p,
              )
            : old,
      );
    }
    queryClient.setQueryData<RouterOutput["catalog"]["phase"]>(
      phaseKey,
      (old) =>
        old
          ? {
              ...old,
              lessons: old.lessons.map((l) =>
                l.id === lessonId ? { ...l, status: target } : l,
              ),
            }
          : old,
    );
  }

  function restore(snap: Snapshot) {
    setStatus(snap.prevStatus);
    queryClient.setQueryData(syllabusKey, snap.syllabus);
    queryClient.setQueryData(phasesKey, snap.phases);
    queryClient.setQueryData(phaseKey, snap.phase);
  }

  function invalidateAll() {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: syllabusKey }),
      queryClient.invalidateQueries({ queryKey: phasesKey }),
      queryClient.invalidateQueries({ queryKey: phaseKey }),
      queryClient.invalidateQueries({
        queryKey: trpc.progress.overview.queryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.progress.continue.queryOptions().queryKey,
      }),
    ]);
  }

  const mark = useMutation(
    trpc.progress.markComplete.mutationOptions({
      onMutate: async () => {
        await cancelRelated();
        const snap = snapshot(status);
        applyOptimistic("COMPLETED", status);
        return snap;
      },
      onError: (_error, _variables, context) => {
        if (context) restore(context);
        toast.error("Gagal menyimpan. Coba lagi.");
      },
      onSuccess: () => {
        toast.success("Ditandai selesai");
        if (next) {
          router.push(`/learn/${next.phaseSlug}/${next.slug}`);
        } else {
          onMarkedLast?.();
        }
      },
      onSettled: invalidateAll,
    }),
  );

  const unmark = useMutation(
    trpc.progress.unmark.mutationOptions({
      onMutate: async () => {
        await cancelRelated();
        const snap = snapshot(status);
        applyOptimistic("IN_PROGRESS", status);
        return snap;
      },
      onError: (_error, _variables, context) => {
        if (context) restore(context);
        toast.error("Gagal menyimpan. Coba lagi.");
      },
      onSuccess: () => {
        toast.success("Tanda selesai dibatalkan");
        onUnmarked?.();
      },
      onSettled: invalidateAll,
    }),
  );

  const pending = mark.isPending || unmark.isPending;

  if (status === "COMPLETED") {
    return (
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => unmark.mutate({ lessonId })}
        className="min-w-0 flex-1 justify-center"
      >
        <Undo2 className="size-4 shrink-0" />
        <span className="truncate">Batalkan selesai</span>
      </Button>
    );
  }

  return (
    <Button
      disabled={pending}
      onClick={() => mark.mutate({ lessonId })}
      className="min-w-0 flex-1 justify-center"
    >
      <Check className="size-4 shrink-0" />
      <span className="truncate">Selesai dan lanjut</span>
    </Button>
  );
}
