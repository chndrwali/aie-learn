"use client";

import { formatLastViewed } from "@/modules/learning/lib/relative-time";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ProgressMark } from "./progress-mark";

/** 5 aktivitas terakhir di dashboard (FR-011, dari progress.overview). */
export function RecentActivity() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.progress.overview.queryOptions());

  if (data.recent.length === 0) {
    return <p className="font-sans text-sm text-muted-foreground">Belum ada aktivitas.</p>;
  }

  return (
    <ul className="space-y-1">
      {data.recent.map((item) => (
        <li key={item.lessonId}>
          <Link
            href={`/learn/${item.phaseSlug}/${item.slug}`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-muted/50"
          >
            <ProgressMark status={item.status} />
            <span className="min-w-0 flex-1 truncate font-sans text-sm">
              {item.title}
            </span>
            <span className="shrink-0 font-sans text-xs text-muted-foreground">
              {formatLastViewed(item.lastViewedAt, new Date())}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
