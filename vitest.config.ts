import path from "node:path";
import { defineConfig } from "vitest/config";

// Samakan alias "@/*" dengan tsconfig, supaya test bisa mengimpor modul
// yang sama seperti kode aplikasi (mis. "@/lib/prisma", "@/trpc/init").
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
