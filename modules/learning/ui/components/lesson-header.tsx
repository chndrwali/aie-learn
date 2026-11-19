import { Badge } from "@/components/ui/badge";

export type LessonHeaderLesson = {
  title: string;
  motto: string | null;
  type: "LEARN" | "BUILD" | null;
  languages: string[];
  prerequisites: string | null;
  estimatedMinutes: number | null;
  phaseNumber: number;
  phaseTitle: string;
};

/**
 * Header materi (RSC, front-end-flow.md): judul, motto, atribut
 * (jenis, bahasa, estimasi), prasyarat. Atribut dipisahkan jarak,
 * bukan titik tengah (DESIGN.md §4).
 */
export function LessonHeader({ lesson }: { lesson: LessonHeaderLesson }) {
  return (
    <header className="mb-8">
      <p className="mb-3 font-sans text-sm text-muted-foreground">
        Fase {lesson.phaseNumber} · {lesson.phaseTitle}
      </p>
      <h1 className="font-sans text-4xl leading-[1.15] font-semibold tracking-[-0.01em]">
        {lesson.title}
      </h1>
      {lesson.motto ? (
        <p className="mt-4 font-sans text-lg text-muted-foreground">
          {lesson.motto}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-sm">
        <Badge
          variant="outline"
          className={
            lesson.type === "BUILD" ? "border-primary text-foreground" : ""
          }
        >
          {lesson.type === "BUILD" ? "Praktik" : "Konsep"}
        </Badge>
        {lesson.languages.length > 0 ? (
          <span>{lesson.languages.join(", ")}</span>
        ) : null}
        {lesson.estimatedMinutes ? (
          <span>{lesson.estimatedMinutes} menit</span>
        ) : null}
      </div>
      {lesson.prerequisites ? (
        <p className="mt-4 font-sans text-sm text-muted-foreground">
          Prasyarat: {lesson.prerequisites}
        </p>
      ) : null}
    </header>
  );
}
