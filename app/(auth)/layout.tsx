import { getSession } from "@/hooks/get-session";
import { AuthLayout } from "@/modules/auth/ui/layout/auth-layout";
import { redirect } from "next/navigation";

export default async function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session) {
    // Pengguna yang sudah login tidak perlu melihat halaman auth.
    // Tujuan default pasca-login adalah /dashboard (T4); /admin tetap
    // bisa dibuka langsung bagi admin.
    redirect("/dashboard");
  }

  return <AuthLayout>{children}</AuthLayout>;
}
