import { TRPCError } from "@trpc/server";
import prisma from "@/lib/prisma";

/** Pesan NOT_FOUND sesuai tabel error di backend_flow.md. */
export function notFound(): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "Materi tidak ditemukan.",
  });
}

/** Lesson harus ada dan aktif; dipakai semua mutation progress. */
export async function requireActiveLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, isActive: true },
  });
  if (!lesson || !lesson.isActive) throw notFound();
  return lesson;
}

/** Fase aktif berdasarkan slug; null bila tidak ada/nonaktif. */
export async function findActivePhase(phaseSlug: string) {
  return prisma.phase.findFirst({
    where: { slug: phaseSlug, isActive: true },
    select: { id: true, number: true, slug: true, title: true, tagline: true },
  });
}
