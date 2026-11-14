import { getSession } from "@/hooks/get-session";
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

  return <>{children}</>;
}
