import { Check, Circle } from "lucide-react";

/** Status progres satu materi. `null` = belum ada baris progres. */
export type LessonStatus = "IN_PROGRESS" | "COMPLETED" | null;

const LABELS: Record<"COMPLETED" | "IN_PROGRESS" | "NONE", string> = {
  COMPLETED: "Selesai",
  IN_PROGRESS: "Sedang dipelajari",
  NONE: "Belum dimulai",
};

/**
 * Penanda progres (DESIGN.md §5): bentuk berbeda per status, bukan cuma
 * warna — ○ cincin kosong Grafit, ◐ setengah terisi Sinyal, ● penuh Sinyal
 * dengan centang. `role="img"` + aria-label supaya terbaca screen reader.
 */
export function ProgressMark({ status }: { status: LessonStatus }) {
  if (status === "COMPLETED") {
    return (
      <span
        role="img"
        aria-label={LABELS.COMPLETED}
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary"
      >
        <Check className="size-3 text-primary-foreground" strokeWidth={3} />
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span role="img" aria-label={LABELS.IN_PROGRESS} className="shrink-0">
        <svg
          viewBox="0 0 16 16"
          className="size-4 text-primary"
          aria-hidden="true"
        >
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 1.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />
        </svg>
      </span>
    );
  }
  return (
    <Circle
      role="img"
      aria-label={LABELS.NONE}
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
}
