import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import LearnerHeader from "@/modules/learning/ui/layout/learner-header";
import LearnerSidebar from "@/modules/learning/ui/layout/learner-sidebar";
import { cookies } from "next/headers";

/**
 * Shell learner (T6, DESIGN.md §4, §6): Sidebar shadcn + header +
 * <main id="main-content"> (target skip link). Pola mengikuti
 * modules/admin/ui/layout/admin-layout.tsx: status sidebar disimpan
 * di cookie `sidebar_state`.
 */
export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  // Learner default TERBUKA saat pertama kali (tanpa cookie): nav
  // Dashboard/Kurikulum langsung terlihat. Beda dengan admin yang
  // default tertutup — di sini sidebar adalah peta kurikulumnya.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <LearnerSidebar />
      {/* fixed overflow container (horizontal scroll) - https://github.com/shadcn-ui/ui/issues/5545#issuecomment-2867696778 */}
      <SidebarInset className="min-w-0">
        <LearnerHeader />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
