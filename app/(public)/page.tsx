import { getSession } from "@/hooks/get-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Landing sementara (T4). Landing lengkap FR-001 (ringkasan fase dari DB,
// cara kerja, footer atribusi) menyusul di task berikutnya.
export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        AIE Learn
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Belajar AI Engineering dari nol, dalam Bahasa Indonesia. 542 materi
        dalam 20 fase. Masuk untuk mulai belajar.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {session ? (
          <Button asChild size="lg">
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link href="/register">Daftar</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Masuk</Link>
            </Button>
          </>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Materi dari{" "}
        <a
          href="https://github.com/rohitg00/ai-engineering-from-scratch"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          rohitg00/ai-engineering-from-scratch
        </a>{" "}
        (MIT).
      </p>
    </main>
  );
}
