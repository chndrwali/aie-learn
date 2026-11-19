import { PhaseDetail } from "@/modules/learning/ui/components/phase-detail";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";
import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

/** Halaman satu fase (FR-005): header + daftar materi urut. */
export default async function PhasePage({
  params,
}: {
  params: Promise<{ phase: string }>;
}) {
  const { phase } = await params;

  try {
    await caller.catalog.phase({ phaseSlug: phase });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
  await prefetch(trpc.catalog.phase.queryOptions({ phaseSlug: phase }));

  return (
    <HydrateClient>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <PhaseDetail phaseSlug={phase} />
      </div>
    </HydrateClient>
  );
}
