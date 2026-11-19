"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Error boundary rute materi (front-end-flow.md): sebut apa yang terjadi
 * dan langkah berikutnya, tanpa permintaan maaf berlebihan.
 */
export default function LessonError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Materi gagal dimuat
      </h1>
      <p className="text-muted-foreground">
        Terjadi kesalahan saat memuat materi. Coba lagi, atau kembali ke
        kurikulum.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Coba lagi</Button>
        <Button variant="outline" asChild>
          <Link href="/curriculum">Kembali ke kurikulum</Link>
        </Button>
      </div>
    </div>
  );
}
