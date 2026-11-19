import prisma from "@/lib/prisma";
import { findActivePhase, notFound } from "./common";

/**
 * catalog.phases — semua fase aktif + lessonCount + completedCount milik user.
 * Agregasi: groupBy untuk total, satu findMany untuk yang selesai (DATABASE.md).
 */
export async function getPhases(userId: string) {
  const [phases, totals, done] = await Promise.all([
    prisma.phase.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
      select: { id: true, number: true, slug: true, title: true, tagline: true },
    }),
    prisma.lesson.groupBy({
      by: ["phaseId"],
      where: { isActive: true, phase: { isActive: true } },
      _count: { _all: true },
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId,
        status: "COMPLETED",
        lesson: { isActive: true },
      },
      select: { lesson: { select: { phaseId: true } } },
    }),
  ]);

  const totalByPhase = new Map(totals.map((t) => [t.phaseId, t._count._all]));
  const doneByPhase = new Map<string, number>();
  for (const d of done) {
    const phaseId = d.lesson.phaseId;
    doneByPhase.set(phaseId, (doneByPhase.get(phaseId) ?? 0) + 1);
  }

  return phases.map((p) => ({
    id: p.id,
    number: p.number,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    lessonCount: totalByPhase.get(p.id) ?? 0,
    completedCount: doneByPhase.get(p.id) ?? 0,
  }));
}

/**
 * catalog.phase — fase + materi aktif urut sortOrder + status user per materi.
 * NOT_FOUND jika slug tidak ada atau nonaktif.
 */
export async function getPhase(userId: string, phaseSlug: string) {
  const phase = await findActivePhase(phaseSlug);
  if (!phase) throw notFound();

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      where: { phaseId: phase.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        number: true,
        sortOrder: true,
        title: true,
        type: true,
        languages: true,
        estimatedMinutes: true,
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { phaseId: phase.id, isActive: true } },
      select: { lessonId: true, status: true },
    }),
  ]);

  const statusByLesson = new Map(progress.map((p) => [p.lessonId, p.status]));

  return {
    phase,
    lessons: lessons.map((l) => ({
      ...l,
      status: statusByLesson.get(l.id) ?? null,
    })),
  };
}
