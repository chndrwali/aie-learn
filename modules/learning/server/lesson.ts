import prisma from "@/lib/prisma";
import { findActivePhase, notFound } from "./common";

const lessonSummarySelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  estimatedMinutes: true,
  sortOrder: true,
} as const;

/**
 * lesson.get — materi lengkap (contentMd), prev/next lintas fase (ringkas),
 * status user, dan catatan user. NOT_FOUND jika tidak ada atau nonaktif.
 */
export async function getLesson(
  userId: string,
  phaseSlug: string,
  lessonSlug: string,
) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      isActive: true,
      phase: { slug: phaseSlug, isActive: true },
    },
    select: {
      id: true,
      slug: true,
      number: true,
      sortOrder: true,
      title: true,
      motto: true,
      type: true,
      languages: true,
      prerequisites: true,
      estimatedMinutes: true,
      contentMd: true,
      phase: { select: { slug: true, title: true } },
    },
  });
  if (!lesson) throw notFound();

  const [prev, next, progress, note] = await Promise.all([
    prisma.lesson.findFirst({
      where: { isActive: true, sortOrder: { lt: lesson.sortOrder } },
      orderBy: { sortOrder: "desc" },
      select: {
        slug: true,
        title: true,
        phase: { select: { slug: true } },
      },
    }),
    prisma.lesson.findFirst({
      where: { isActive: true, sortOrder: { gt: lesson.sortOrder } },
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        title: true,
        phase: { select: { slug: true } },
      },
    }),
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      select: { status: true },
    }),
    prisma.note.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      select: { body: true },
    }),
  ]);

  const { phase, ...rest } = lesson;
  return {
    lesson: {
      ...rest,
      phaseSlug: phase.slug,
      phaseTitle: phase.title,
    },
    prev: prev
      ? { slug: prev.slug, phaseSlug: prev.phase.slug, title: prev.title }
      : null,
    next: next
      ? { slug: next.slug, phaseSlug: next.phase.slug, title: next.title }
      : null,
    status: progress?.status ?? null,
    note: note?.body ?? null,
  };
}

/**
 * lesson.syllabus — daftar ringkas materi fase + status (untuk sidebar).
 * Tanpa contentMd. NOT_FOUND jika fase tidak ada atau nonaktif.
 */
export async function getSyllabus(userId: string, phaseSlug: string) {
  const phase = await findActivePhase(phaseSlug);
  if (!phase) throw notFound();

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      where: { phaseId: phase.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: lessonSummarySelect,
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
