import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getLesson, getSyllabus } from "@/modules/learning/server/lesson";

const phaseSlugInput = z.object({ phaseSlug: z.string().min(1) });

export const lessonRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        phaseSlug: z.string().min(1),
        lessonSlug: z.string().min(1),
      }),
    )
    .query(({ ctx, input }) =>
      getLesson(ctx.auth.user.id, input.phaseSlug, input.lessonSlug),
    ),
  syllabus: protectedProcedure
    .input(phaseSlugInput)
    .query(({ ctx, input }) => getSyllabus(ctx.auth.user.id, input.phaseSlug)),
});
