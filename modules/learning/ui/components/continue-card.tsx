"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLastViewed } from "@/modules/learning/lib/relative-time";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";

/**
 * Kartu "Lanjutkan belajar" di dashboard (US-04, DESIGN.md §4). Satu-satunya
 * kartu di dashboard. Learner baru (reason "start") mendapat ajakan
 * "Mulai dari Fase 0"; semua materi selesai → ajakan ke kurikulum.
 */
export function ContinueCard() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.progress.continue.queryOptions());
  const { lesson, reason, lastViewedAt } = data;

  if (!lesson) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Semua materi selesai</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-sans text-sm text-muted-foreground">
            Kamu sudah menyelesaikan seluruh kurikulum.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/curriculum">Lihat kurikulum</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const href = `/learn/${lesson.phaseSlug}/${lesson.slug}`;
  const phaseLabel =
    lesson.phaseNumber != null ? `Fase ${lesson.phaseNumber}` : "Fase";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans">
          {reason === "start" ? "Mulai dari Fase 0" : "Lanjutkan belajar"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="font-sans text-sm font-medium">
          {phaseLabel}, {lesson.title}
        </p>
        {reason === "start" ? (
          <p className="font-sans text-sm text-muted-foreground">
            Kamu belum memulai. Mulai dari materi pertama.
          </p>
        ) : reason === "resume" && lastViewedAt ? (
          <p className="font-sans text-sm text-muted-foreground">
            Terakhir dibuka {formatLastViewed(lastViewedAt, new Date())}
          </p>
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            Materi berikutnya yang belum selesai
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={href}>
            {reason === "start" ? "Mulai belajar" : "Lanjutkan belajar"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
