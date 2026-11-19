import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import Link from "next/link";

/**
 * Materi tidak ditemukan (front-end-flow.md): kembali ke daftar fase.
 * Fase dibaca dari path yang diminta (header x-pathname dari proxy);
 * tanpa itu, fallback ke /curriculum.
 */
export default async function LessonNotFound() {
  const headersList = await headers();
  const path = headersList.get("x-pathname") ?? "";
  const match = /^\/learn\/([^/]+)/.exec(path);
  const backHref = match ? `/curriculum/${match[1]}` : "/curriculum";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Materi tidak ditemukan
      </h1>
      <p className="text-muted-foreground">
        Materi yang kamu cari tidak ada atau sudah tidak aktif.
      </p>
      <Button asChild>
        <Link href={backHref}>Kembali ke daftar fase</Link>
      </Button>
    </div>
  );
}
