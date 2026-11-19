"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { List } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Daftar materi fase aktif. Desktop: kolom kiri 260px (DESIGN.md §4).
 * Mobile (< lg): tombol "Daftar materi" membuka Sheet.
 * Tanpa penanda status progres dulu (T8) — hanya judul + nomor + aktif.
 */
export function SyllabusSidebar({
  phaseSlug,
  currentSlug,
}: {
  phaseSlug: string;
  currentSlug: string;
}) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.lesson.syllabus.queryOptions({ phaseSlug }),
  );
  const [open, setOpen] = useState(false);

  const list = (
    <nav aria-label="Daftar materi fase ini">
      <p className="font-sans text-sm font-semibold">{data.phase.title}</p>
      <p className="mt-0.5 mb-4 font-sans text-xs text-muted-foreground">
        Fase {data.phase.number}
      </p>
      <ul className="space-y-1">
        {data.lessons.map((lesson) => {
          const isActive = lesson.slug === currentSlug;
          return (
            <li key={lesson.id}>
              <Link
                href={`/learn/${phaseSlug}/${lesson.slug}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 font-sans text-sm ${
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <span className="shrink-0 font-mono text-xs leading-5">
                  {String(lesson.number).padStart(2, "0")}
                </span>
                <span className="min-w-0">{lesson.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      <aside className="hidden w-[260px] shrink-0 lg:block">
        <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-y-auto border-r px-4 py-6">
          {list}
        </div>
      </aside>
      <div className="px-4 pt-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <List className="size-4" />
              Daftar materi
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left font-sans">
                {data.phase.title}
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{list}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
