/**
 * Test integrasi T5 (backend_flow.md, TASKS.md T5).
 *
 * Menjalankan router tRPC lewat caller dengan session dimock, melawan
 * database development (Neon) ASLI — bukan mock Prisma. Dijalankan eksplisit:
 *
 *   DATABASE_URL=$(~/workspace/tunnel-url.sh) npx vitest run \
 *     modules/learning/server/learning.integration.test.ts
 *
 * File ini di-skip bila DATABASE_URL tidak diset, supaya `npm test` biasa
 * tidak menyentuh DB. User tes dibuat via Prisma langsung lalu dihapus di
 * afterAll (beserta progress-nya); tidak ada data lain yang disentuh.
 */
import { afterAll, beforeAll, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/hooks/get-session", () => ({ getSession: vi.fn() }));

import { getSession } from "@/hooks/get-session";
import prisma from "@/lib/prisma";
import { appRouter } from "@/trpc/routers/_app";

const mockGetSession = getSession as unknown as Mock;

const USER_A = "t5-a@test.local";
const USER_B = "t5-b@test.local";

function sessionFor(userId: string) {
  return {
    session: {
      id: "test-session",
      userId,
      expiresAt: new Date(Date.now() + 3_600_000),
      token: "test-token",
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    },
    user: {
      id: userId,
      name: "Test T5",
      email: `${userId}@test.local`,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
    },
  };
}

function callerFor(userId: string | null) {
  mockGetSession.mockResolvedValue(
    userId
      ? (sessionFor(userId) as unknown as Awaited<
          ReturnType<typeof getSession>
        >)
      : null,
  );
  return appRouter.createCaller({ userId: "test", ip: "127.0.0.1" });
}

describe.skipIf(!process.env.DATABASE_URL)("tRPC learning (DB test)", () => {
  let userAId = "";
  let userBId = "";
  let firstLessonId = "";
  let thirdLessonId = "";
  let firstPhaseSlug = "";
  let firstLessonSlug = "";

  beforeAll(async () => {
    // Bersihkan sisa run sebelumnya (idempotent), lalu buat user tes.
    for (const email of [USER_A, USER_B]) {
      const old = await prisma.user.findUnique({ where: { email } });
      if (old) {
        await prisma.lessonProgress.deleteMany({ where: { userId: old.id } });
        await prisma.user.delete({ where: { id: old.id } });
      }
    }
    const [a, b] = await Promise.all([
      prisma.user.create({
        data: { name: "Test T5 A", email: USER_A, emailVerified: true },
      }),
      prisma.user.create({
        data: { name: "Test T5 B", email: USER_B, emailVerified: true },
      }),
    ]);
    userAId = a.id;
    userBId = b.id;

    const lessons = await prisma.lesson.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 3,
      select: { id: true, slug: true, phase: { select: { slug: true } } },
    });
    expect(lessons).toHaveLength(3);
    firstLessonId = lessons[0].id;
    thirdLessonId = lessons[2].id;
    firstLessonSlug = lessons[0].slug;
    firstPhaseSlug = lessons[0].phase.slug;
  });

  afterAll(async () => {
    for (const email of [USER_A, USER_B]) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.lessonProgress.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    }
  });

  it("landing.outline: publik, allowlist, tanpa contentMd/judul materi", async () => {
    const anon = callerFor(null);
    const out = await anon.landing.outline();
    expect(out.totals.phases).toBe(20);
    expect(out.totals.lessons).toBe(542);
    expect(out.phases).toHaveLength(20);
    const json = JSON.stringify(out);
    expect(json).not.toContain("contentMd");
    for (const p of out.phases) {
      expect(Object.keys(p).sort()).toEqual([
        "lessonCount",
        "number",
        "slug",
        "tagline",
        "title",
      ]);
    }
  });

  it("tanpa session: procedure protected → UNAUTHORIZED", async () => {
    const anon = callerFor(null);
    await expect(anon.catalog.phases()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      anon.lesson.get({ phaseSlug: firstPhaseSlug, lessonSlug: firstLessonSlug }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anon.progress.overview()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("catalog.phases: 20 fase, lessonCount total 542, completed 0", async () => {
    const caller = callerFor(userAId);
    const phases = await caller.catalog.phases();
    expect(phases).toHaveLength(20);
    expect(phases.reduce((s, p) => s + p.lessonCount, 0)).toBe(542);
    expect(phases.every((p) => p.completedCount === 0)).toBe(true);
  });

  it("catalog.phase: valid → materi urut + status null; slug salah → NOT_FOUND", async () => {
    const caller = callerFor(userAId);
    const res = await caller.catalog.phase({ phaseSlug: firstPhaseSlug });
    expect(res.lessons.length).toBeGreaterThan(0);
    const orders = res.lessons.map((l) => l.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(res.lessons.every((l) => l.status === null)).toBe(true);
    await expect(
      caller.catalog.phase({ phaseSlug: "99-tidak-ada" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lesson.get: contentMd + prev/next + status; slug salah → NOT_FOUND", async () => {
    const caller = callerFor(userAId);
    const res = await caller.lesson.get({
      phaseSlug: firstPhaseSlug,
      lessonSlug: firstLessonSlug,
    });
    expect(typeof res.lesson.contentMd).toBe("string");
    expect(res.lesson.contentMd.length).toBeGreaterThan(0);
    expect(res.prev).toBeNull();
    expect(res.next).not.toBeNull();
    expect(res.next?.slug).toBeTruthy();
    expect(res.next?.phaseSlug).toBeTruthy();
    expect(res.status).toBeNull();
    expect(res.note).toBeNull();
    await expect(
      caller.lesson.get({ phaseSlug: firstPhaseSlug, lessonSlug: "x-tidak-ada" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lesson.syllabus: tanpa contentMd", async () => {
    const caller = callerFor(userAId);
    const res = await caller.lesson.syllabus({ phaseSlug: firstPhaseSlug });
    expect(res.lessons.length).toBeGreaterThan(0);
    expect(JSON.stringify(res)).not.toContain("contentMd");
  });

  it("progress.visit → IN_PROGRESS; visit tidak menurunkan COMPLETED", async () => {
    const caller = callerFor(userAId);
    expect(await caller.progress.visit({ lessonId: firstLessonId })).toEqual({
      status: "IN_PROGRESS",
    });
    await caller.progress.markComplete({ lessonId: firstLessonId });
    expect(await caller.progress.visit({ lessonId: firstLessonId })).toEqual({
      status: "COMPLETED",
    });
  });

  it("markComplete idempotent: 1 baris, completedAt tetap", async () => {
    const caller = callerFor(userAId);
    const first = await caller.progress.markComplete({
      lessonId: thirdLessonId,
    });
    const second = await caller.progress.markComplete({
      lessonId: thirdLessonId,
    });
    expect(first.status).toBe("COMPLETED");
    expect(second.status).toBe("COMPLETED");
    expect(first.completedAt).not.toBeNull();
    expect(new Date(second.completedAt!).getTime()).toBe(
      new Date(first.completedAt!).getTime(),
    );
    const rows = await prisma.lessonProgress.findMany({
      where: { userId: userAId, lessonId: thirdLessonId },
    });
    expect(rows).toHaveLength(1);
  });

  it("unmark: COMPLETED → IN_PROGRESS + completedAt null; tanpa baris → no-op", async () => {
    const caller = callerFor(userAId);
    expect(await caller.progress.unmark({ lessonId: thirdLessonId })).toEqual({
      status: "IN_PROGRESS",
    });
    const row = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: userAId, lessonId: thirdLessonId } },
    });
    expect(row?.status).toBe("IN_PROGRESS");
    expect(row?.completedAt).toBeNull();
    // Unmark materi yang belum pernah dibuka: no-op, tidak error.
    const fresh = await prisma.lesson.findFirst({
      where: { isActive: true, sortOrder: { gt: 100 } },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    expect(
      await caller.progress.unmark({ lessonId: fresh!.id }),
    ).toEqual({ status: null });
  });

  it("visit/markComplete lessonId tidak ada → NOT_FOUND", async () => {
    const caller = callerFor(userAId);
    await expect(
      caller.progress.visit({ lessonId: "cm0000000000000000000000" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.progress.markComplete({ lessonId: "cm0000000000000000000000" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("progress.overview: hitungan benar; continue: start → resume → next", async () => {
    const callerA = callerFor(userAId);
    // A sudah: lesson 1 COMPLETED (visit+complete), lesson 3 IN_PROGRESS (unmark).
    const overview = await callerA.progress.overview();
    expect(overview.totalLessons).toBe(542);
    expect(overview.completed).toBe(1);
    expect(overview.percent).toBe(0); // round(1/542*100) = 0
    expect(
      overview.perPhase.reduce((s, p) => s + p.completed, 0),
    ).toBe(1);
    expect(overview.recent.length).toBeGreaterThan(0);

    const cont = await callerA.progress.continue();
    // Riwayat terakhir = lesson 3 (IN_PROGRESS) → resume.
    expect(cont.reason).toBe("resume");
    expect(cont.lesson?.id).toBe(thirdLessonId);

    // User B masih baru → start di materi pertama.
    const callerB = callerFor(userBId);
    const contB = await callerB.progress.continue();
    expect(contB.reason).toBe("start");
    expect(contB.lesson?.id).toBe(firstLessonId);
    await callerB.progress.visit({ lessonId: thirdLessonId });
    const contB2 = await callerB.progress.continue();
    expect(contB2.reason).toBe("resume");
    expect(contB2.lesson?.id).toBe(thirdLessonId);
    await callerB.progress.markComplete({ lessonId: thirdLessonId });
    const contB3 = await callerB.progress.continue();
    expect(contB3.reason).toBe("next");
    expect(contB3.lesson?.id).not.toBe(thirdLessonId);
  });

  it("isolasi antar user: progress A tidak terlihat B", async () => {
    const callerB = callerFor(userBId);
    const overviewB = await callerB.progress.overview();
    // B baru menyelesaikan lesson 3 di test sebelumnya.
    expect(overviewB.completed).toBe(1);
    const lessonB = await callerB.lesson.get({
      phaseSlug: firstPhaseSlug,
      lessonSlug: firstLessonSlug,
    });
    // Lesson 1 diselesaikan A, bukan B → status B null.
    expect(lessonB.status).toBeNull();
    const phasesB = await callerB.catalog.phases();
    const phase0B = phasesB.find((p) => p.slug === firstPhaseSlug)!;
    // B hanya menyelesaikan lesson 3 (fase 00) → 1; A menyelesaikan lesson 1
    // (juga fase 00) → 1 juga, tapi itu hitungan per user, bukan global.
    expect(phase0B.completedCount).toBe(1);
    const callerA = callerFor(userAId);
    const phasesA = await callerA.catalog.phases();
    const phase0A = phasesA.find((p) => p.slug === firstPhaseSlug)!;
    expect(phase0A.completedCount).toBe(1);
  });
});
