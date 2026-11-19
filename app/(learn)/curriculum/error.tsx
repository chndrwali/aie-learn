"use client";

import { Button } from "@/components/ui/button";

/** Error boundary kurikulum. */
export default function CurriculumError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Kurikulum gagal dimuat
      </h1>
      <p className="text-muted-foreground">
        Terjadi kesalahan saat memuat kurikulum. Coba lagi.
      </p>
      <Button onClick={() => reset()}>Coba lagi</Button>
    </div>
  );
}
