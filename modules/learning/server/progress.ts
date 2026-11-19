import prisma from "@/lib/prisma";
import {
  computePhaseProgress,
  resolveContinue,
} from "@/modules/learning/lib/progress";
import { requireActiveLesson } from "./common";

/**
 * progress.visit — upsert, perbarui lastViewedAt. Tidak pernah menurunkan
 * COMPLETED (update hanya menyentuh lastViewedAt, DATABASE.md).
 */
export async function visit(userId: string, lessonId: string) {
  await requireActiveLesson(lessonId);
  const row = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: { lastViewedAt: new Date() },
  });
  return { status: row.status };
}

/**
 * progress.markComplete — upsert COMPLETED. completedAt tetap jika sudah
 * selesai (idempotent, DATABASE.md).
 */
export async function markComplete(userId: string, lessonId: string) {
  await requireActiveLesson(lessonId);
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { status: true, completedAt: true },
  });
  const row = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      status: "COMPLETED",
      completedAt: new Date(),
    },
    update: {
      status: "COMPLETED",
      lastViewedAt: new Date(),
      completedAt:
        existing?.status === "COMPLETED" ? existing.completedAt : new Date(),
    },
  });
  return { status: row.status, completedAt: row.completedAt };
}

/**
 * progress.unmark — jika ada baris: IN_PROGRESS, completedAt = null.
 * Jika tidak ada: no-op (status null).
 */
export async function unmark(userId: string, lessonId: string) {
  await requireActiveLesson(lessonId);
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { id: true },
  });
  if (!existing) return { status: null };
  const row = await prisma.lessonProgress.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: { status: "IN_PROGRESS", completedAt: null },
  });
  return { status: row.status };
}

/**
 * progress.overview — totalLessons, completed, percent, perPhase[], recent[5].
 * Total keseluruhan dihitung dari jumlah, bukan rata-rata persen.
 */
export async function getOverview(userId: string) {
  const [phases, totals, done, recent] = await Promise.all([
    prisma.phase.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
      select: { id: true, slug: true, title: true },
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
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { isActive: true } },
      orderBy: { lastViewedAt: "desc" },
      take: 5,
      select: {
        status: true,
        lastViewedAt: true,
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            phase: { select: { slug: true } },
          },
        },
      },
    }),
  ]);

  const perPhase = computePhaseProgress(
    totals.map((t) => ({ phaseId: t.phaseId, total: t._count._all })),
    done.map((d) => d.lesson.phaseId),
  );
  const phaseById = new Map(phases.map((p) => [p.id, p]));

  const totalLessons = perPhase.reduce((s, p) => s + p.total, 0);
  const completed = perPhase.reduce((s, p) => s + p.completed, 0);

  return {
    totalLessons,
    completed,
    percent:
      totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100),
    perPhase: perPhase.map((p) => ({
      ...p,
      slug: phaseById.get(p.phaseId)?.slug ?? "",
      title: phaseById.get(p.phaseId)?.title ?? "",
    })),
    recent: recent.map((r) => ({
      lessonId: r.lesson.id,
      slug: r.lesson.slug,
      phaseSlug: r.lesson.phase.slug,
      title: r.lesson.title,
      status: r.status,
      lastViewedAt: r.lastViewedAt,
    })),
  };
}

/**
 * progress.continue — aturan "Lanjutkan" di lib/progress.ts.
 * Riwayat = seluruh progress user (lessonId + status) terurut lastViewedAt.
 */
export async function getContinue(userId: string) {
  const [history, lessons, completedRows] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { isActive: true } },
      orderBy: { lastViewedAt: "desc" },
      select: { lessonId: true, status: true, lastViewedAt: true },
    }),
    prisma.lesson.findMany({
      where: { isActive: true, phase: { isActive: true } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        sortOrder: true,
        phase: { select: { slug: true, number: true, title: true } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId,
        status: "COMPLETED",
        lesson: { isActive: true },
      },
      select: { lessonId: true },
    }),
  ]);

  const result = resolveContinue(
    history,
    lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      phaseSlug: l.phase.slug,
      phaseNumber: l.phase.number,
      phaseTitle: l.phase.title,
      title: l.title,
      sortOrder: l.sortOrder,
    })),
    completedRows.map((r) => r.lessonId),
  );

  // Terakhir dibuka: entri riwayat terbaru yang materinya masih aktif
  // (dipakai kartu "Lanjutkan belajar" di dashboard; bukan bagian aturan
  // resolveContinue di lib/).
  const activeIds = new Set(lessons.map((l) => l.id));
  const currentEntry = history.find((e) => activeIds.has(e.lessonId));

  return { ...result, lastViewedAt: currentEntry?.lastViewedAt ?? null };
}
