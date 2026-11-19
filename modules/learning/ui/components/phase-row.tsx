import { Progress } from "@/components/ui/progress";
import { derivePhaseStatus } from "@/modules/learning/lib/progress";
import Link from "next/link";
import { ProgressMark } from "./progress-mark";

/**
 * Satu baris fase (DESIGN.md §4): penanda status, nomor, judul, jumlah
 * selesai, bar progres. Baris, bukan kartu — seluruh baris adalah tautan
 * ke halaman fase.
 */
export function PhaseRow({
  number,
  slug,
  title,
  tagline,
  lessonCount,
  completedCount,
  showTagline = false,
}: {
  number: number;
  slug: string;
  title: string;
  tagline: string | null;
  lessonCount: number;
  completedCount: number;
  showTagline?: boolean;
}) {
  const percent =
    lessonCount === 0
      ? 0
      : Math.round((completedCount / lessonCount) * 100);
  return (
    <Link
      href={`/curriculum/${slug}`}
      className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted/50"
    >
      <ProgressMark
        status={derivePhaseStatus(completedCount, lessonCount)}
      />
      <span className="shrink-0 font-mono text-sm text-muted-foreground">
        {String(number).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm font-medium">
          {title}
        </span>
        {showTagline && tagline && (
          <span className="block truncate font-sans text-xs text-muted-foreground">
            {tagline}
          </span>
        )}
      </span>
      <span className="shrink-0 font-sans text-sm tabular-nums text-muted-foreground">
        {completedCount} / {lessonCount}
      </span>
      <Progress
        value={percent}
        aria-label={`Progres ${title}: ${completedCount} dari ${lessonCount} selesai`}
        className="hidden w-24 shrink-0 sm:block"
      />
    </Link>
  );
}
