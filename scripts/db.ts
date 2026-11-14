/**
 * scripts/db.ts — Prisma client untuk script CLI (di luar Next).
 * Adapter sama seperti lib/prisma.ts; dotenv dimuat oleh script pemanggil
 * (import "dotenv/config" harus jadi baris pertama di script).
 */
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
