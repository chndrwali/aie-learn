#!/usr/bin/env tsx
/**
 * Muat terjemahan manual (dikerjakan Muse, tanpa API) ke DB.
 *
 * Pemakaian:
 *   DATABASE_URL=$(~/workspace/tunnel-url.sh) npx tsx scripts/load-manual-translation.ts
 *
 * Membaca file Markdown di `.manual/id/<sourcePath>.md` — satu file per lesson,
 * isinya contentMd Bahasa Indonesia (body tanpa H1/motto/meta, link sudah
 * ditulis ulang seperti hasil Pass 1+2 ingest). Untuk tiap file:
 *   - cari lesson di DB via sourcePath (harus ada; kalau tidak, dilewati + warning)
 *   - hitung ulang contentHash dengan rumus yang sama seperti ingest
 *     (sha256 dari contentMd + title + motto + type + languages + prerequisites
 *     + estimatedMinutes, dipisah "\n") — supaya sync berikut mengenalinya
 *     sebagai "unchanged" dan tidak menimpa
 *   - update contentMd + contentHash
 *
 * File di `.manual/` adalah staging (git-ignored); sumber kebenaran tetap DB.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import prisma from "../lib/prisma";

const MANUAL_DIR = path.join(process.cwd(), ".manual", "id");

function contentHash(
  contentMd: string,
  meta: {
    title: string;
    motto: string | null;
    type: string | null;
    languages: string[];
    prerequisites: string | null;
    estimatedMinutes: number | null;
  },
): string {
  return createHash("sha256")
    .update(
      [
        contentMd,
        meta.title,
        meta.motto ?? "",
        meta.type ?? "",
        meta.languages.join(","),
        meta.prerequisites ?? "",
        meta.estimatedMinutes ?? "",
      ].join("\n"),
    )
    .digest("hex");
}

function collectFiles(dir: string, base: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, base, out);
    else if (entry.endsWith(".md")) out.push(path.relative(base, full));
  }
}

async function main(): Promise<void> {
  if (!existsSync(MANUAL_DIR)) {
    console.log(`Direktori ${MANUAL_DIR} tidak ada — tidak ada yang dimuat.`);
    return;
  }
  const files: string[] = [];
  collectFiles(MANUAL_DIR, MANUAL_DIR, files);
  console.log(`${files.length} file terjemahan ditemukan.`);
  let updated = 0;
  let skipped = 0;
  for (const rel of files.sort()) {
    const sourcePath = rel.replace(/\.md$/, "").replace(/\\/g, "/");
    const contentMd = readFileSync(path.join(MANUAL_DIR, rel), "utf-8").trim();
    if (!contentMd) {
      console.log(`  SKIP ${sourcePath}: file kosong`);
      skipped += 1;
      continue;
    }
    const row = await prisma.lesson.findUnique({
      where: { sourcePath },
      select: {
        title: true,
        motto: true,
        type: true,
        languages: true,
        prerequisites: true,
        estimatedMinutes: true,
      },
    });
    if (!row) {
      console.log(`  SKIP ${sourcePath}: lesson tidak ada di DB`);
      skipped += 1;
      continue;
    }
    await prisma.lesson.update({
      where: { sourcePath },
      data: { contentMd, contentHash: contentHash(contentMd, row) },
    });
    updated += 1;
  }
  console.log(`Selesai: ${updated} lesson dimuat, ${skipped} dilewati.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
