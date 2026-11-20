import { type Page } from "@playwright/test";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Helper E2E (T11). Akun uji memakai email unik per run dan dihapus lagi
 * di afterAll tiap file (DB kembali 0 user, mengikuti kebiasaan T0–T10).
 * Bersih-bersih butuh DATABASE_URL (tunnel Neon) — tanpanya dilewati
 * tanpa menggagalkan test.
 */

export const TEST_PASSWORD = "Test1234!";

const trackedEmails: string[] = [];

export function uniqueEmail(tag: string): string {
  const email = `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  trackedEmails.push(email);
  return email;
}

export async function deleteTrackedUsers(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || trackedEmails.length === 0) return;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await prisma.lessonProgress.deleteMany({
      where: { user: { email: { in: trackedEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: trackedEmails } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

/** Daftar lewat UI. Sukses → /login (form starter, bukan /dashboard). */
export async function registerViaUi(
  page: Page,
  name: string,
  email: string,
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Full Name").fill(name);
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await page.waitForURL("/login", { timeout: 30_000 });
}

/** Masuk lewat UI. Tujuan tergantung callbackURL (atau /dashboard). */
export async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
}
