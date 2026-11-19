import { getSession } from "@/hooks/get-session";
import { ContinueCard } from "@/modules/learning/ui/components/continue-card";
import { PhaseList } from "@/modules/learning/ui/components/phase-list";
import { RecentActivity } from "@/modules/learning/ui/components/recent-activity";
import { TotalProgress } from "@/modules/learning/ui/components/total-progress";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

/**
 * Dashboard learner (FR-011, DESIGN.md §4): sapaan, kartu Lanjutkan
 * belajar, progres total, daftar semua fase, 5 aktivitas terakhir.
 * Peta kurikulum ada di T10 — belum di sini.
 */
export default async function DashboardPage() {
  const session = await getSession();
  const firstName = session?.user?.name?.split(" ")[0];

  await Promise.all([
    prefetch(trpc.progress.continue.queryOptions()),
    prefetch(trpc.progress.overview.queryOptions()),
    prefetch(trpc.catalog.phases.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Halo{firstName ? `, ${firstName}` : ""}.
        </h1>
        <div className="mt-6">
          <ContinueCard />
        </div>
        <div className="mt-8">
          <TotalProgress />
        </div>
        <section aria-label="Semua fase" className="mt-8">
          <h2 className="mb-2 font-sans text-sm font-semibold">
            Semua fase
          </h2>
          <PhaseList />
        </section>
        <section aria-label="Aktivitas terakhir" className="mt-8">
          <h2 className="mb-2 font-sans text-sm font-semibold">
            Aktivitas terakhir
          </h2>
          <RecentActivity />
        </section>
      </div>
    </HydrateClient>
  );
}
