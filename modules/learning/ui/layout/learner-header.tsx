"use client";

import { ThemeModeToggle } from "@/components/custom/theme-mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LearnerBreadcrumbs } from "@/modules/learning/ui/components/learner-breadcrumbs";

/**
 * Header learner (DESIGN.md §4, §6): trigger sidebar, breadcrumb, toggle
 * tema. Tanpa bayangan dan tanpa kartu melayang — garis yang membawa
 * struktur. Pencarian (Cmd+K) menyusul di T14.
 */
export default function LearnerHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <LearnerBreadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <ThemeModeToggle />
      </div>
    </header>
  );
}
