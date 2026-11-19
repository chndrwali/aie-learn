"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Mencatat kunjungan materi sekali saat halaman dibuka (progress.visit).
 * Mutation idempotent di server (upsert); gagal simpan dibiarkan diam —
 * ini pelacakan latar, bukan aksi pengguna.
 */
export function LessonVisitTracker({ lessonId }: { lessonId: string }) {
  const trpc = useTRPC();
  const { mutate } = useMutation(trpc.progress.visit.mutationOptions());

  useEffect(() => {
    mutate({ lessonId });
  }, [lessonId, mutate]);

  return null;
}
