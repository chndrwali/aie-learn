import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getPhase, getPhases } from "@/modules/learning/server/catalog";

const phaseSlugInput = z.object({ phaseSlug: z.string().min(1) });

export const catalogRouter = createTRPCRouter({
  phases: protectedProcedure.query(({ ctx }) => getPhases(ctx.auth.user.id)),
  phase: protectedProcedure
    .input(phaseSlugInput)
    .query(({ ctx, input }) => getPhase(ctx.auth.user.id, input.phaseSlug)),
});
