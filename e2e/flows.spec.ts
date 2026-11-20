import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  TEST_PASSWORD,
  deleteTrackedUsers,
  loginViaUi,
  registerViaUi,
  uniqueEmail,
} from "./helpers";

/**
 * Tiga alur utama (T11, PRD §9): (1) anonim ke /learn → login → kembali
 * ke materi tujuan, (2) register → buka materi → selesai → refresh →
 * status tetap, (3) dashboard "Lanjutkan belajar" menuju materi benar.
 * Tiap test memakai akun baru (email unik) dan dihapus di afterAll.
 */

const LESSON_1 = "/learn/00-setup-and-tooling/01-dev-environment";
const LESSON_2 = "/learn/00-setup-and-tooling/02-git-and-collaboration";

test.afterAll(async () => {
  await deleteTrackedUsers();
});

/** Buat akun lewat API sign-up (konteks request terpisah — page tetap anonim). */
async function createUserViaApi(
  request: APIRequestContext,
  name: string,
  email: string,
) {
  const res = await request.post("/api/auth/sign-up/email", {
    data: { name, email, password: TEST_PASSWORD },
  });
  expect(res.ok()).toBe(true);
}

test("1. anonim ke materi → login → kembali ke materi tujuan", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("anon");
  await createUserViaApi(request, "E2E Anon", email);

  await page.goto(LESSON_1);
  await expect(page).toHaveURL(/\/login\?callbackURL=/);
  await expect(
    page.getByText("Masuk untuk membuka materi."),
  ).toBeVisible();

  await loginViaUi(page, email);
  // Navigasi pasca-login meng-compile rute materi bila dev server masih
  // dingin — beri 60 detik (bukan bug aplikasi; cache .next menghangat
  // di run berikutnya).
  await page.waitForURL(`**${LESSON_1}`, { timeout: 60_000 });
  await expect(
    page.locator("#lesson-content h2").first(),
  ).toBeVisible({ timeout: 60_000 });
});

test("2. register → buka materi → selesai → refresh → status tetap", async ({
  page,
}) => {
  const email = uniqueEmail("reg");
  await registerViaUi(page, "E2E Dua", email);
  await loginViaUi(page, email);
  await page.waitForURL("/dashboard", { timeout: 30_000 });

  await page.goto(LESSON_1);
  await expect(
    page.locator("#lesson-content h2").first(),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Selesai dan lanjut" }).click();
  await expect(page.getByText("Ditandai selesai")).toBeVisible();
  await page.waitForURL(`**${LESSON_2}`, { timeout: 30_000 });

  await page.reload();
  await page.goto(LESSON_1);
  await expect(
    page.locator("#lesson-content h2").first(),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("button", { name: "Batalkan selesai" }),
  ).toBeVisible();
  const mark = page.locator(
    'aside a[href$="01-dev-environment"] [role="img"]',
  );
  await expect(mark).toHaveAttribute("aria-label", "Selesai");
});

test("3. dashboard Lanjutkan belajar menuju materi benar", async ({
  page,
}) => {
  const email = uniqueEmail("resume");
  await registerViaUi(page, "E2E Tiga", email);
  await loginViaUi(page, email);
  await page.waitForURL("/dashboard", { timeout: 30_000 });

  await page.goto(LESSON_1);
  await expect(
    page.locator("#lesson-content h2").first(),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Selesai dan lanjut" }).click();
  await expect(page.getByText("Ditandai selesai")).toBeVisible();
  await page.waitForURL(`**${LESSON_2}`, { timeout: 30_000 });

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Lanjutkan belajar" }).click();
  await page.waitForURL(`**${LESSON_2}`, { timeout: 30_000 });
  await expect(
    page.locator("#lesson-content h2").first(),
  ).toBeVisible({ timeout: 60_000 });
});
