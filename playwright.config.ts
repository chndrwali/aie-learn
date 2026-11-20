import { defineConfig, devices } from "@playwright/test";

/**
 * E2E AIE Learn (T11). Menjalankan alur utama lewat UI di dev server.
 *
 * Prasyarat sebelum jalan:
 * - Tunnel Neon hidup: `setsid nohup python3 ~/workspace/pg-tunnel.py ...`
 * - `DATABASE_URL=$(~/workspace/tunnel-url.sh) npx playwright test`
 *   (dibutuhkan helper bersih-bersih akun uji di e2e/helpers.ts).
 * webServer di bawah menyalakan dev server bila belum jalan (dan memakai
 * yang sudah jalan bila ada).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "DATABASE_URL=$(/home/hatch/workspace/tunnel-url.sh) npm run dev -- --port 3000",
    url: "http://localhost:3000/",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
