"use client";

import { derivePhaseStatus } from "@/modules/learning/lib/progress";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PhaseMap } from "./phase-map";

/**
 * Peta kurikulum di dashboard: simpul memakai status progres user dan
 * menaut ke halaman fase. Tanpa animasi masuk (dalam aplikasi, gerak hanya
 * sebagai respons aksi — DESIGN.md §7).
 */
export function DashboardPhaseMap() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.catalog.phases.queryOptions());
  const statuses = new Map(
    data.map((phase) => [
      phase.number,
      {
        status: derivePhaseStatus(
          phase.completedCount,
          phase.lessonCount,
        ),
        completed: phase.completedCount,
        total: phase.lessonCount,
      },
    ]),
  );
  return <PhaseMap phases={data} statuses={statuses} interactive />;
}
