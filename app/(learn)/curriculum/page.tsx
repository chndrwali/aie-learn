import { PhaseList } from "@/modules/learning/ui/components/phase-list";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";

/** Daftar semua fase aktif (FR-004), urut nomor, dengan progres user. */
export default async function CurriculumPage() {
  const phases = await caller.catalog.phases();
  const totalLessons = phases.reduce((s, p) => s + p.lessonCount, 0);
  await prefetch(trpc.catalog.phases.queryOptions());

  return (
    <HydrateClient>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Kurikulum
        </h1>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          {totalLessons} materi dalam {phases.length} fase, dari dasar sampai
          capstone.
        </p>
        <div className="mt-6">
          <PhaseList showTagline />
        </div>
      </div>
    </HydrateClient>
  );
}
