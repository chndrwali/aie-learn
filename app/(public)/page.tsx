import { getSession } from "@/hooks/get-session";
import { PhaseMap } from "@/modules/learning/ui/components/phase-map";
import { Button } from "@/components/ui/button";
import { caller } from "@/trpc/server";
import Link from "next/link";

/**
 * Landing final (FR-001, FR-013, FR-016; DESIGN.md §4): hero + peta
 * kurikulum, daftar fase dari landing.outline, cara kerja, footer atribusi.
 * Halaman publik: TIDAK memuat contentMd atau judul materi — hanya nomor,
 * judul, dan jumlah materi per fase (allowlist landing.outline).
 */
export default async function HomePage() {
  const session = await getSession();
  const outline = await caller.landing.outline();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-sans text-lg font-semibold tracking-tight"
          >
            AIE Learn
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <Button asChild>
                <Link href="/dashboard">Ke dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Daftar</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
        <section aria-label="Pengantar">
          <h1 className="max-w-2xl font-sans text-4xl font-bold tracking-tight sm:text-5xl">
            Pelajari AI engineering dari dasar, sampai agent.
          </h1>
          <p className="mt-4 max-w-xl font-sans text-lg text-muted-foreground">
            {outline.totals.lessons} materi dalam {outline.totals.phases}{" "}
            fase. Masuk untuk mulai belajar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {session ? (
              <Button asChild size="lg">
                <Link href="/dashboard">Ke dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/register">Daftar gratis</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/login">Sudah punya akun? Masuk</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section aria-label="Peta kurikulum" className="mt-12">
          <h2 className="font-sans text-sm font-semibold">Peta kurikulum</h2>
          <div className="mt-4">
            <PhaseMap phases={outline.phases} animate />
          </div>
        </section>

        <section aria-label="Isi kurikulum" className="mt-12">
          <h2 className="font-sans text-sm font-semibold">Isi kurikulum</h2>
          <ul className="mt-4 space-y-1">
            {outline.phases.map((phase) => (
              <li
                key={phase.number}
                className="flex items-center gap-3 px-3 py-2"
              >
                <span className="font-mono text-sm text-muted-foreground">
                  {String(phase.number).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium">
                  {phase.title}
                </span>
                <span className="font-sans text-sm text-muted-foreground">
                  {phase.lessonCount} materi
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Cara kerja" className="mt-12">
          <h2 className="font-sans text-sm font-semibold">Cara kerja</h2>
          <ol className="mt-4 space-y-3">
            <li className="flex gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                1.
              </span>
              <p className="font-sans text-sm">
                <span className="font-medium">Baca materi.</span>{" "}
                <span className="text-muted-foreground">
                  Materi berbahasa Indonesia, dari dasar sampai capstone.
                </span>
              </p>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                2.
              </span>
              <p className="font-sans text-sm">
                <span className="font-medium">Tandai selesai.</span>{" "}
                <span className="text-muted-foreground">
                  Progres tersimpan di akunmu dan lanjut di perangkat lain.
                </span>
              </p>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                3.
              </span>
              <p className="font-sans text-sm">
                <span className="font-medium">Lanjutkan kapan saja.</span>{" "}
                <span className="text-muted-foreground">
                  Dashboard selalu tahu materi berikutnya.
                </span>
              </p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 font-sans text-sm text-muted-foreground sm:px-6">
          <p>
            Kurikulum oleh{" "}
            <a
              href="https://github.com/rohitg00/ai-engineering-from-scratch"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              rohitg00/ai-engineering-from-scratch
            </a>{" "}
            (lisensi MIT), diterjemahkan ke Bahasa Indonesia.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href="https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Lisensi MIT
            </a>
            <a
              href="https://github.com/chndrwali/aie-learn/blob/main/THIRD_PARTY_NOTICES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              THIRD_PARTY_NOTICES.md
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
