import { extractHeadings } from "@/modules/learning/lib/toc-headings";
import { Skeleton } from "@/components/ui/skeleton";
import { AttributionFooter } from "@/modules/learning/ui/components/attribution-footer";
import { LessonFooterNav } from "@/modules/learning/ui/components/lesson-footer-nav";
import { LessonHeader } from "@/modules/learning/ui/components/lesson-header";
import { LessonToc } from "@/modules/learning/ui/components/lesson-toc";
import { LessonVisitTracker } from "@/modules/learning/ui/components/lesson-visit-tracker";
import { MarkdownRenderer } from "@/modules/learning/ui/components/markdown-renderer";
import { SyllabusSidebar } from "@/modules/learning/ui/components/syllabus-sidebar";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";
import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

function SidebarSkeleton() {
  return (
    <div className="hidden w-[260px] shrink-0 lg:block">
      <div className="space-y-2 border-r px-4 py-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-4 h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ phase: string; lesson: string }>;
}) {
  const { phase, lesson: lessonSlug } = await params;

  let data;
  try {
    data = await caller.lesson.get({ phaseSlug: phase, lessonSlug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
  const { lesson, prev, next, status } = data;

  // Prefetch daftar materi fase agar sidebar langsung tampil.
  await prefetch(trpc.lesson.syllabus.queryOptions({ phaseSlug: phase }));

  return (
    <HydrateClient>
      <LessonVisitTracker lessonId={lesson.id} />
      <div className="flex flex-col lg:flex-row">
        <Suspense fallback={<SidebarSkeleton />}>
          <SyllabusSidebar phaseSlug={phase} currentSlug={lesson.slug} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-[68ch] px-4 py-8 sm:px-6">
            <LessonHeader
              lesson={{
                title: lesson.title,
                motto: lesson.motto,
                type: lesson.type,
                languages: lesson.languages,
                prerequisites: lesson.prerequisites,
                estimatedMinutes: lesson.estimatedMinutes,
                phaseNumber: lesson.phaseNumber,
                phaseTitle: lesson.phaseTitle,
              }}
            />
            <article
              id="lesson-content"
              className="font-serif text-[18px] leading-[1.7] break-words"
            >
              <MarkdownRenderer content={lesson.contentMd} />
            </article>
            <LessonFooterNav
              lessonId={lesson.id}
              phaseSlug={phase}
              status={status}
              prev={prev}
              next={next}
            />
            <AttributionFooter sourcePath={lesson.sourcePath} />
          </div>
        </div>
        <LessonToc items={extractHeadings(lesson.contentMd)} />
      </div>
    </HydrateClient>
  );
}
