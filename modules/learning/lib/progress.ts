/**
 * Logika murni progress belajar (backend_flow.md).
 *
 * Pure function — tanpa I/O, tanpa impor Prisma. Diuji di progress.test.ts.
 * Dipakai oleh modules/learning/server/progress.ts.
 */

// Status progress sebagai string polos (bukan enum Prisma — lib/ tidak
// mengimpor Prisma).
export type ProgressStatusValue = "IN_PROGRESS" | "COMPLETED";

export type ContinueLessonSummary = {
  id: string;
  slug: string;
  phaseSlug: string;
  title: string;
  sortOrder: number;
};

export type ContinueReason = "start" | "resume" | "next" | "all-done";

export type ContinueResult = {
  lesson: ContinueLessonSummary | null;
  reason: ContinueReason;
};

export type ViewedEntry = {
  lessonId: string;
  status: ProgressStatusValue;
};

/**
 * Aturan "Lanjutkan" (backend_flow.md):
 * 1. Tidak ada riwayat → materi pertama aktif, "start".
 * 2. Materi terakhir dibuka IN_PROGRESS → itu, "resume".
 * 3. Materi terakhir dibuka COMPLETED → materi pertama yang belum COMPLETED
 *    dengan sortOrder lebih besar; jika tidak ada, yang pertama belum
 *    COMPLETED secara global → "next".
 * 4. Semua materi COMPLETED → { lesson: null, reason: "all-done" }.
 *
 * `lastViewed` terurut dari yang terakhir dibuka; entri yang materinya sudah
 * dinonaktifkan (tidak ada di `lessonsOrdered`) diabaikan, pakai riwayat
 * berikutnya.
 */
export function resolveContinue(
  lastViewed: readonly ViewedEntry[],
  lessonsOrdered: readonly ContinueLessonSummary[],
  completedIds: ReadonlySet<string> | readonly string[],
): ContinueResult {
  const completed = new Set(completedIds);
  const byId = new Map(lessonsOrdered.map((l) => [l.id, l]));

  const currentEntry = lastViewed.find((e) => byId.has(e.lessonId));

  if (!currentEntry) {
    const first = lessonsOrdered[0] ?? null;
    return first
      ? { lesson: first, reason: "start" }
      : { lesson: null, reason: "all-done" };
  }

  const current = byId.get(currentEntry.lessonId)!;

  if (currentEntry.status === "IN_PROGRESS") {
    return { lesson: current, reason: "resume" };
  }

  const next =
    lessonsOrdered.find(
      (l) => l.sortOrder > current.sortOrder && !completed.has(l.id),
    ) ?? lessonsOrdered.find((l) => !completed.has(l.id));

  return next
    ? { lesson: next, reason: "next" }
    : { lesson: null, reason: "all-done" };
}

export type PhaseTotal = {
  phaseId: string;
  total: number;
};

export type PhaseProgress = {
  phaseId: string;
  total: number;
  completed: number;
  percent: number;
};

/**
 * Agregasi progress per fase (backend_flow.md).
 * `completedPhaseIds`: satu entri per materi selesai (phaseId materi itu).
 * `percent = total === 0 ? 0 : Math.round(completed / total * 100)`.
 */
export function computePhaseProgress(
  totalsByPhase: readonly PhaseTotal[],
  completedPhaseIds: readonly string[],
): PhaseProgress[] {
  const counts = new Map<string, number>();
  for (const phaseId of completedPhaseIds) {
    counts.set(phaseId, (counts.get(phaseId) ?? 0) + 1);
  }
  return totalsByPhase.map(({ phaseId, total }) => {
    const completed = counts.get(phaseId) ?? 0;
    return {
      phaseId,
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });
}
