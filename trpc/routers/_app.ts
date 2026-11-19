import { createTRPCRouter } from "@/trpc/init";
import { landingRouter } from "./landing";
import { catalogRouter } from "./catalog";
import { lessonRouter } from "./lesson";
import { progressRouter } from "./progress";

export const appRouter = createTRPCRouter({
  landing: landingRouter,
  catalog: catalogRouter,
  lesson: lessonRouter,
  progress: progressRouter,
  // Portfolio Content Administration
  //   userAdmin: userAdminRouter,
  //   projectAdmin: projectAdminRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
