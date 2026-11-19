import { getSession } from "@/hooks/get-session";
import LearnerLayout from "@/modules/learning/ui/layout/learner-layout";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Area belajar tidak boleh terindeks mesin pencari.
export const metadata = {
  robots: { index: false, follow: false },
};

// Guard lapis 2 (front-end-flow.md): validasi session di server.
// Lapis 1 (proxy.ts) hanya jalur cepat berbasis cookie; lapis 3 (tRPC
// protectedProcedure) menjaga data. Tanpa session → login + callbackURL.
export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    const headersList = await headers();
    const path =
      headersList.get("x-pathname") ??
      headersList.get("x-invoke-path") ??
      headersList.get("next-url") ??
      "/dashboard";
    redirect(`/login?callbackURL=${encodeURIComponent(path)}`);
  }

  // Skip link (DESIGN.md §9): elemen pertama layout, muncul saat fokus.
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:underline"
      >
        Lompat ke konten
      </a>
      <LearnerLayout>{children}</LearnerLayout>
    </>
  );
}
