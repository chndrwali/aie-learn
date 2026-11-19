import { describe, expect, it } from "vitest";
import {
  computePhaseProgress,
  resolveContinue,
  summarizeLessonStatuses,
  type ContinueLessonSummary,
} from "./progress";

const L = (
  id: string,
  sortOrder: number,
): ContinueLessonSummary => ({
  id,
  slug: `lesson-${id}`,
  phaseSlug: "00-setup-and-tooling",
  title: `Lesson ${id}`,
  sortOrder,
});

const LESSONS = [L("a", 1), L("b", 2), L("c", 3)];

describe("resolveContinue", () => {
  it("kasus 1: tanpa riwayat → materi pertama, start", () => {
    expect(resolveContinue([], LESSONS, [])).toEqual({
      lesson: LESSONS[0],
      reason: "start",
    });
  });

  it("kasus 2: terakhir dibuka IN_PROGRESS → resume", () => {
    expect(
      resolveContinue([{ lessonId: "b", status: "IN_PROGRESS" }], LESSONS, []),
    ).toEqual({ lesson: LESSONS[1], reason: "resume" });
  });

  it("kasus 3a: terakhir COMPLETED → berikutnya yang belum selesai", () => {
    expect(
      resolveContinue(
        [{ lessonId: "a", status: "COMPLETED" }],
        LESSONS,
        ["a"],
      ),
    ).toEqual({ lesson: LESSONS[1], reason: "next" });
  });

  it("kasus 3b: terakhir COMPLETED dan sisanya setelahnya selesai → cari global", () => {
    // a selesai, b selesai, c belum: terakhir dibuka b → c.
    expect(
      resolveContinue(
        [{ lessonId: "b", status: "COMPLETED" }],
        LESSONS,
        ["a", "b"],
      ),
    ).toEqual({ lesson: LESSONS[2], reason: "next" });
    // a selesai, c selesai, b belum: terakhir dibuka c → b (global).
    expect(
      resolveContinue(
        [{ lessonId: "c", status: "COMPLETED" }],
        LESSONS,
        ["a", "c"],
      ),
    ).toEqual({ lesson: LESSONS[1], reason: "next" });
  });

  it("kasus 4: semua COMPLETED → null, all-done", () => {
    expect(
      resolveContinue(
        [{ lessonId: "c", status: "COMPLETED" }],
        LESSONS,
        ["a", "b", "c"],
      ),
    ).toEqual({ lesson: null, reason: "all-done" });
  });

  it("materi terakhir dinonaktifkan → pakai riwayat berikutnya", () => {
    // Riwayat: z (dinonaktifkan) lalu b (IN_PROGRESS).
    expect(
      resolveContinue(
        [
          { lessonId: "z", status: "IN_PROGRESS" },
          { lessonId: "b", status: "IN_PROGRESS" },
        ],
        LESSONS,
        [],
      ),
    ).toEqual({ lesson: LESSONS[1], reason: "resume" });
  });

  it("semua riwayat dinonaktifkan → seperti tanpa riwayat", () => {
    expect(
      resolveContinue(
        [{ lessonId: "z", status: "COMPLETED" }],
        LESSONS,
        [],
      ),
    ).toEqual({ lesson: LESSONS[0], reason: "start" });
  });

  it("tidak ada materi aktif → null, all-done", () => {
    expect(resolveContinue([], [], [])).toEqual({
      lesson: null,
      reason: "all-done",
    });
  });
});

describe("computePhaseProgress", () => {
  it("menghitung completed + percent per fase", () => {
    expect(
      computePhaseProgress(
        [
          { phaseId: "p1", total: 4 },
          { phaseId: "p2", total: 2 },
          { phaseId: "p3", total: 0 },
        ],
        ["p1", "p1", "p2"],
      ),
    ).toEqual([
      { phaseId: "p1", total: 4, completed: 2, percent: 50 },
      { phaseId: "p2", total: 2, completed: 1, percent: 50 },
      { phaseId: "p3", total: 0, completed: 0, percent: 0 },
    ]);
  });

  it("percent dibulatkan, total 0 → 0", () => {
    expect(
      computePhaseProgress([{ phaseId: "p1", total: 3 }], ["p1"]),
    ).toEqual([{ phaseId: "p1", total: 3, completed: 1, percent: 33 }]);
    expect(computePhaseProgress([{ phaseId: "p1", total: 0 }], [])).toEqual([
      { phaseId: "p1", total: 0, completed: 0, percent: 0 },
    ]);
  });

  it("completed di fase yang tidak ada di totals diabaikan", () => {
    expect(
      computePhaseProgress(
        [{ phaseId: "p1", total: 1 }],
        ["p1", "pX", "pX"],
      ),
    ).toEqual([{ phaseId: "p1", total: 1, completed: 1, percent: 100 }]);
  });
});

describe("summarizeLessonStatuses", () => {
  it("daftar kosong → 0 dari 0, 0%", () => {
    expect(summarizeLessonStatuses([])).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
    });
  });

  it("menghitung hanya COMPLETED; IN_PROGRESS dan null bukan selesai", () => {
    expect(
      summarizeLessonStatuses([
        "COMPLETED",
        "IN_PROGRESS",
        null,
        "COMPLETED",
        null,
      ]),
    ).toEqual({ completed: 2, total: 5, percent: 40 });
  });

  it("semua selesai → 100%", () => {
    expect(summarizeLessonStatuses(["COMPLETED", "COMPLETED"])).toEqual({
      completed: 2,
      total: 2,
      percent: 100,
    });
  });

  it("persen dibulatkan", () => {
    expect(summarizeLessonStatuses(["COMPLETED", null, null])).toEqual({
      completed: 1,
      total: 3,
      percent: 33,
    });
  });
});
