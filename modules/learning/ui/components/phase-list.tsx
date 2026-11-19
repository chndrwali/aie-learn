"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PhaseRow } from "./phase-row";

/**
 * Daftar semua fase aktif (FR-004), dipakai dashboard ("Semua fase") dan
 * halaman kurikulum. Kosong → "Konten belum disinkronkan".
 */
export function PhaseList({ showTagline = false }: { showTagline?: boolean }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.catalog.phases.queryOptions());

  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <p className="font-sans text-sm font-medium">
          Konten belum disinkronkan
        </p>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Katalog masih kosong. Jalankan{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            npm run content:sync
          </code>{" "}
          untuk mengisi kurikulum.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {data.map((phase) => (
        <li key={phase.id}>
          <PhaseRow
            number={phase.number}
            slug={phase.slug}
            title={phase.title}
            tagline={phase.tagline}
            lessonCount={phase.lessonCount}
            completedCount={phase.completedCount}
            showTagline={showTagline}
          />
        </li>
      ))}
    </ul>
  );
}
