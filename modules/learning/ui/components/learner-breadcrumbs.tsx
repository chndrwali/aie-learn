"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

type Crumb = { title: string; link: string };

/** "03-deep-learning-core" → "Fase 3". Slug tanpa awalan angka dirapikan. */
function phaseLabel(slug: string): string {
  const match = /^(\d+)-/.exec(slug);
  if (match) return `Fase ${Number.parseInt(match[1], 10)}`;
  return prettifySlug(slug);
}

/** "01-why-transformers" → "Why Transformers". */
function prettifySlug(slug: string): string {
  return slug
    .replace(/^\d+-/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Breadcrumb learner (DESIGN.md §6, §8): label Bahasa Indonesia, tanpa
 * segmen teknis "/learn". Judul materi memakai slug yang dirapikan sampai
 * T7 menyediakan judul asli lewat data halaman.
 */
function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [];
  if (segments[0] === "dashboard") {
    return [{ title: "Dashboard", link: "/dashboard" }];
  }
  if (segments[0] === "curriculum") {
    const crumbs: Crumb[] = [{ title: "Kurikulum", link: "/curriculum" }];
    if (segments[1]) {
      crumbs.push({
        title: phaseLabel(segments[1]),
        link: `/curriculum/${segments[1]}`,
      });
    }
    return crumbs;
  }
  if (segments[0] === "learn" && segments[1]) {
    return [
      { title: "Kurikulum", link: "/curriculum" },
      {
        title: phaseLabel(segments[1]),
        link: `/curriculum/${segments[1]}`,
      },
      ...(segments[2]
        ? [
            {
              title: prettifySlug(segments[2]),
              link: `/learn/${segments[1]}/${segments[2]}`,
            },
          ]
        : []),
    ];
  }

  // Rute learner lain (mis. /notes di T13): kapitalisasi segmen.
  return segments.map((segment, index) => ({
    title: prettifySlug(segment),
    link: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

export function LearnerBreadcrumbs() {
  const pathname = usePathname();
  // Tanpa useMemo manual: React Compiler yang memoize (AGENTS.md).
  const items = buildCrumbs(pathname);
  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.link}>
            {index !== items.length - 1 && (
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={item.link}>{item.title}</BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {index < items.length - 1 && (
              <BreadcrumbSeparator className="hidden md:block">
                <Slash />
              </BreadcrumbSeparator>
            )}
            {index === items.length - 1 && (
              <BreadcrumbPage>{item.title}</BreadcrumbPage>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
