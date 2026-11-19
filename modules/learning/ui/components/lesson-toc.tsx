"use client";

import type { TocHeading } from "@/modules/learning/lib/toc-headings";
import { useEffect, useState } from "react";

/**
 * Daftar isi materi. Item datang dari server (extractHeadings) supaya
 * id cocok dengan heading hasil render; komponen ini hanya melacak
 * heading aktif via IntersectionObserver. Disembunyikan < xl (DESIGN.md §4).
 */
export function LessonToc({ items }: { items: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="hidden w-[200px] shrink-0 xl:block">
      <div className="sticky top-24 px-4 py-8">
        <p className="mb-3 font-sans text-sm font-semibold">Di halaman ini</p>
        <nav aria-label="Daftar isi materi">
          <ul className="space-y-2 border-l">
            {items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                  <a
                    href={`#${item.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`block border-l-2 py-0.5 pr-2 pl-3 font-sans text-sm ${
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
