import { BookOpen, LayoutDashboard, type LucideIcon } from "lucide-react";

export type LearnerNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

/**
 * Navigasi learner (T6). Sengaja hanya dua item: Dashboard dan Kurikulum.
 * Catatan (/notes) menyusul di T13 saat halamannya ada — jangan tautkan
 * ke rute yang belum dibangun.
 */
export const learnerNavItems: LearnerNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kurikulum", url: "/curriculum", icon: BookOpen },
];
