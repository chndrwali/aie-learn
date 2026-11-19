import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export type FooterNavLesson = {
  slug: string;
  phaseSlug: string;
  title: string;
};

/**
 * Navigasi footer materi (RSC): Sebelumnya / Berikutnya. Tanpa tombol
 * selesai dulu — itu T8 (Progress UX).
 */
export function LessonFooterNav({
  prev,
  next,
}: {
  prev: FooterNavLesson | null;
  next: FooterNavLesson | null;
}) {
  return (
    <nav
      aria-label="Navigasi materi"
      className="mt-12 flex items-center justify-between gap-3 border-t pt-6"
    >
      {prev ? (
        <Button variant="outline" asChild className="min-w-0 max-w-[48%]">
          <Link href={`/learn/${prev.phaseSlug}/${prev.slug}`}>
            <ChevronLeft className="size-4 shrink-0" />
            <span className="min-w-0 truncate">
              Sebelumnya
              <span className="hidden sm:inline">: {prev.title}</span>
            </span>
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button asChild className="min-w-0 max-w-[48%]">
          <Link href={`/learn/${next.phaseSlug}/${next.slug}`}>
            <span className="min-w-0 truncate">
              Berikutnya
              <span className="hidden sm:inline">: {next.title}</span>
            </span>
            <ChevronRight className="size-4 shrink-0" />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
