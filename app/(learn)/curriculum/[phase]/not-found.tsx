import { Button } from "@/components/ui/button";
import Link from "next/link";

/** Fase tidak ditemukan (slug salah / nonaktif). */
export default function PhaseNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Fase tidak ditemukan
      </h1>
      <p className="text-muted-foreground">
        Fase yang kamu cari tidak ada atau sudah tidak aktif.
      </p>
      <Button asChild>
        <Link href="/curriculum">Kembali ke kurikulum</Link>
      </Button>
    </div>
  );
}
