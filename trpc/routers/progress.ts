import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  getContinue,
  getOverview,
  markComplete,
  unmark,
  visit,
} from "@/modules/learning/server/progress";

const lessonIdInput = z.object({ lessonId: z.string().min(1) });

export const progressRouter = createTRPCRouter({
  visit: protectedProcedure
    .input(lessonIdInput)
    .mutation(({ ctx, input }) => visit(ctx.auth.user.id, input.lessonId)),
  markComplete: protectedProcedure
    .input(lessonIdInput)
    .mutation(({ ctx, input }) =>
      markComplete(ctx.auth.user.id, input.lessonId),
    ),
  unmark: protectedProcedure
    .input(lessonIdInput)
    .mutation(({ ctx, input }) => unmark(ctx.auth.user.id, input.lessonId)),
  overview: protectedProcedure.query(({ ctx }) => getOverview(ctx.auth.user.id)),
  continue: protectedProcedure.query(({ ctx }) =>
    getContinue(ctx.auth.user.id),
  ),
});
