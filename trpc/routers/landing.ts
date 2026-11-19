import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getOutline } from "@/modules/learning/server/landing";

export const landingRouter = createTRPCRouter({
  outline: baseProcedure.query(() => getOutline()),
});
