import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ProgressMark, type LessonStatus } from "./progress-mark";

/**
 * Satu baris materi di halaman fase (DESIGN.md §4): status di kiri, judul
 * di tengah, atribut di kanan. Atribut dipisahkan jarak, bukan titik tengah.
 */
export function LessonRow({
  phaseSlug,
  lesson,
}: {
  phaseSlug: string;
  lesson: {
    slug: string;
    number: number;
    title: string;
    type: "LEARN" | "BUILD" | null;
    languages: string[];
    estimatedMinutes: number | null;
    status: LessonStatus;
  };
}) {
  return (
    <Link
      href={`/learn/${phaseSlug}/${lesson.slug}`}
      className="flex flex-col gap-1 rounded-lg px-3 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-3"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <ProgressMark status={lesson.status} />
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {String(lesson.number).padStart(2, "0")}
        </span>
        <span className="min-w-0 truncate font-sans text-sm font-medium">
          {lesson.title}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 font-sans text-xs text-muted-foreground sm:pl-0">
        <Badge
          variant="outline"
          className={lesson.type === "BUILD" ? "border-primary" : ""}
        >
          {lesson.type === "BUILD" ? "Praktik" : "Konsep"}
        </Badge>
        {lesson.languages.length > 0 && (
          <span>{lesson.languages.join(", ")}</span>
        )}
        {lesson.estimatedMinutes != null && (
          <span>{lesson.estimatedMinutes} menit</span>
        )}
      </span>
    </Link>
  );
}
