"use client";

import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarkCompleteButton } from "./mark-complete-button";
import type { LessonStatus } from "./progress-mark";

export type FooterNavLesson = {
  slug: string;
  phaseSlug: string;
  title: string;
};

/**
 * Navigasi footer materi (client): Sebelumnya, tombol selesai, Berikutnya.
 * Saat belum selesai, "Selesai dan lanjut" adalah aksi majunya (tidak ada
 * tombol "Berikutnya" terpisah). Saat sudah selesai, tombol berubah jadi
 * "Batalkan selesai" dan "Berikutnya" tampil terpisah. Kalau ini materi
 * terakhir fase, setelah ditandai tampil ajakan kembali ke dashboard.
 * Footer menempel di bawah konten (DESIGN.md §4), bukan melayang.
 */
export function LessonFooterNav({
  lessonId,
  phaseSlug,
  status,
  prev,
  next,
}: {
  lessonId: string;
  phaseSlug: string;
  status: LessonStatus;
  prev: FooterNavLesson | null;
  next: FooterNavLesson | null;
}) {
  const [showDone, setShowDone] = useState(false);
  const completed = status === "COMPLETED";

  return (
    <div>
      <nav
        aria-label="Navigasi materi"
        className="mt-12 flex items-center justify-between gap-3 border-t pt-6"
      >
        {prev ? (
          <Button
            variant="outline"
            asChild
            className="min-w-0 shrink-0 sm:max-w-[32%]"
          >
            <Link href={`/learn/${prev.phaseSlug}/${prev.slug}`}>
              <ChevronLeft className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                <span className="hidden sm:inline">Sebelumnya: </span>
                <span className="sm:hidden">Sebelumnya</span>
                <span className="hidden sm:inline">{prev.title}</span>
              </span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <MarkCompleteButton
          lessonId={lessonId}
          phaseSlug={phaseSlug}
          status={status}
          next={next}
          onMarkedLast={() => setShowDone(true)}
          onUnmarked={() => setShowDone(false)}
        />
        {completed && next ? (
          <Button asChild className="min-w-0 shrink-0 sm:max-w-[32%]">
            <Link href={`/learn/${next.phaseSlug}/${next.slug}`}>
              <span className="min-w-0 truncate">
                <span className="hidden sm:inline">Berikutnya: </span>
                <span className="sm:hidden">Berikutnya</span>
                <span className="hidden sm:inline">{next.title}</span>
              </span>
              <ChevronRight className="size-4 shrink-0" />
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>
      {showDone && (
        <div className="mt-6 rounded-lg border bg-muted/40 p-4 font-sans">
          <p className="text-sm font-medium">Materi terakhir sudah selesai.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kamu sudah menyelesaikan seluruh kurikulum. Lanjutkan dari
            dashboard.
          </p>
          <Button asChild className="mt-3" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Kembali ke dashboard
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
