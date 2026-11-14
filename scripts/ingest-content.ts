/**
 * scripts/ingest-content.ts — Script sync konten dari upstream
 * rohitg00/ai-engineering-from-scratch (CONTENT-PIPELINE.md).
 *
 * Alur: fetch (git) -> Pass 1 parse -> Pass 2 rewrite link -> Pass 2b
 * terjemah ke Bahasa Indonesia -> upsert ke DB (Phase, Lesson, ContentSync).
 *
 * Penggunaan:
 *   npm run content:sync -- --dry-run            # report saja, tanpa tulis DB
 *   npm run content:sync                         # sync beneran
 *   npm run content:sync -- --force              # lewati pengaman 80%
 *   npm run content:sync -- --ref <sha|branch>   # pin ref tertentu
 *   npm run content:sync -- --min-chars 200      # ambang stub (default 400)
 *
 * Catatan: koneksi langsung ke Neon dari sandbox gagal TLS — jalankan dengan
 * DATABASE_URL tunnel (lihat AGENTS.md) bila prisma gagal connect.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import prisma from "./db";
import { parseLesson } from "../modules/learning/lib/parse-lesson";
import {
  buildCatalog,
  rewriteLinks,
  type LessonRef,
} from "../modules/learning/lib/rewrite-links";
import { translateMarkdown } from "../modules/learning/lib/translate-lesson";
import { titleCaseFromSlug } from "../modules/learning/lib/parse-lesson";

const REPO_ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(REPO_ROOT, ".content-cache", "upstream");
const PHASES_META_PATH = path.join(REPO_ROOT, "content-meta", "phases.json");
const GLOSSARY_PATH = path.join(REPO_ROOT, "content-meta", "glossary.json");

const DEFAULT_REPO_URL =
  "https://github.com/rohitg00/ai-engineering-from-scratch.git";
const DEFAULT_REF = "main";
const DEFAULT_MIN_CHARS = 400;
const TRANSLATE_DELAY_MS = 1000; // jeda antar lesson (di dalam lesson, Google Translate sudah dijeda per chunk)

interface Args {
  dryRun: boolean;
  force: boolean;
  ref: string;
  minChars: number;
}

interface PhaseMeta {
  title: string;
  tagline: string | null;
}

interface ScannedLesson {
  sourcePath: string;
  phaseDir: string;
  phaseNumber: number;
  lessonDir: string;
  lessonNumber: number;
  phaseSlug: string;
  lessonSlug: string;
  title: string;
  motto: string | null;
  type: "LEARN" | "BUILD" | null;
  languages: string[];
  prerequisites: string | null;
  estimatedMinutes: number | null;
  contentMd: string;
  warnings: string[];
}

interface SyncReport {
  ref: string;
  commitSha: string;
  dryRun: boolean;
  phases: Array<{ slug: string; title: string; lessons: number }>;
  total: number;
  added: number;
  updated: number;
  unchanged: number;
  skipped: number;
  deactivated: number;
  failed: number;
  translated: number;
  untranslated: number;
  totalEstimatedMinutes: number;
  warnings: string[];
  durationMs: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    force: false,
    ref: process.env.CONTENT_REF || DEFAULT_REF,
    minChars: DEFAULT_MIN_CHARS,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--ref" && argv[i + 1]) args.ref = argv[++i];
    else if (a === "--min-chars" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (!Number.isNaN(n) && n >= 0) args.minChars = n;
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: npm run content:sync -- [--dry-run] [--force] [--ref <sha|branch>] [--min-chars <n>]",
      );
      process.exit(0);
    } else {
      console.error(`Argumen tidak dikenal: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

function git(cwd: string, cmd: string): string {
  return execSync(`git ${cmd}`, { cwd, stdio: "pipe", encoding: "utf-8" }).trim();
}

function fetchUpstream(repoUrl: string, ref: string): string {
  rmSync(CACHE_DIR, { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  git(CACHE_DIR, "init -q");
  git(CACHE_DIR, `fetch --depth 1 ${repoUrl} ${ref}`);
  git(CACHE_DIR, "checkout -q FETCH_HEAD");
  return git(CACHE_DIR, "rev-parse HEAD");
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function dirNumber(dir: string): number | null {
  const m = dir.match(/^(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

function contentHash(l: ScannedLesson): string {
  return createHash("sha256")
    .update(
      [
        l.contentMd,
        l.title,
        l.motto ?? "",
        l.type ?? "",
        l.languages.join(","),
        l.prerequisites ?? "",
        l.estimatedMinutes ?? "",
      ].join("\n"),
    )
    .digest("hex");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const startedMs = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const repoUrl = process.env.CONTENT_REPO_URL || DEFAULT_REPO_URL;
  const geminiKey = process.env.GEMINI_API_KEY || undefined;
  const phasesMeta = loadJson<Record<string, PhaseMeta>>(PHASES_META_PATH);
  const glossary = loadJson<{ doNotTranslate: string[] }>(GLOSSARY_PATH);
  const warnings: string[] = [];

  console.log(`Fetch upstream ${repoUrl} @ ${args.ref} ...`);
  const sha = fetchUpstream(repoUrl, args.ref);
  console.log(`Commit: ${sha}`);

  // ---------- Pass 1: parse ----------
  const scanned: ScannedLesson[] = [];
  let skipped = 0;
  const phasesDir = path.join(CACHE_DIR, "phases");
  if (!existsSync(phasesDir)) {
    throw new Error("Direktori phases/ tidak ditemukan di upstream");
  }
  const phaseDirs = readdirSync(phasesDir)
    .filter((d) => dirNumber(d) !== null)
    .sort();
  for (const phaseDir of phaseDirs) {
    const phaseNumber = dirNumber(phaseDir)!;
    const lessonDirs = readdirSync(path.join(phasesDir, phaseDir))
      .filter((d) => dirNumber(d) !== null)
      .sort();
    for (const lessonDir of lessonDirs) {
      const sourcePath = `phases/${phaseDir}/${lessonDir}`;
      const docPath = path.join(phasesDir, phaseDir, lessonDir, "docs", "en.md");
      if (!existsSync(docPath)) {
        skipped += 1;
        warnings.push(`${sourcePath}: dilewati (docs/en.md tidak ada)`);
        continue;
      }
      const parsed = parseLesson(readFileSync(docPath, "utf-8"), lessonDir);
      warnings.push(...parsed.warnings.map((w) => `${sourcePath}: ${w}`));
      if (parsed.contentMd.length < args.minChars) {
        skipped += 1;
        warnings.push(
          `${sourcePath}: dilewati (stub, ${parsed.contentMd.length} karakter < ${args.minChars})`,
        );
        continue;
      }
      scanned.push({
        sourcePath,
        phaseDir,
        phaseNumber,
        lessonDir,
        lessonNumber: dirNumber(lessonDir)!,
        phaseSlug: phaseDir,
        lessonSlug: lessonDir,
        title: parsed.title,
        motto: parsed.motto,
        type: parsed.type,
        languages: parsed.languages,
        prerequisites: parsed.prerequisites,
        estimatedMinutes: parsed.estimatedMinutes,
        contentMd: parsed.contentMd,
        warnings: parsed.warnings,
      });
    }
  }
  scanned.sort((a, b) => a.phaseNumber - b.phaseNumber || a.lessonNumber - b.lessonNumber);

  if (scanned.length === 0) {
    throw new Error("Tidak ada lesson yang berhasil di-scan (total 0)");
  }

  // ---------- Pass 2: rewrite link (butuh katalog lengkap dulu) ----------
  const catalog = buildCatalog(
    scanned.map(
      (l): LessonRef => ({
        phaseSlug: l.phaseSlug,
        lessonSlug: l.lessonSlug,
        sourcePath: l.sourcePath,
      }),
    ),
  );
  for (const lesson of scanned) {
    const { markdown, stats } = rewriteLinks(lesson.contentMd, {
      catalog,
      sourcePath: lesson.sourcePath,
      sha,
    });
    lesson.contentMd = markdown;
    if (stats.githubFallback > 0) {
      warnings.push(
        `${lesson.sourcePath}: ${stats.githubFallback} link jatuh ke GitHub (target tidak ada di katalog)`,
      );
    }
  }

  // ---------- Pass 2b: terjemah (dilewati di dry-run) ----------
  let translated = 0;
  let untranslated = 0;
  let engineUsed: string | null = null;
  if (args.dryRun) {
    untranslated = scanned.length;
    warnings.push(
      "Dry-run: terjemahan dilewati (Pass 2b hanya jalan di sync beneran)",
    );
  } else {
    // Mesin dipilih di translateMarkdown: Gemini bila GEMINI_API_KEY diset,
    // kalau tidak Google Translate tanpa key (Candra: "lo aja yang nerjemahin").
    // Circuit breaker: bila 15 lesson beruntun gagal (biasanya rate limit),
    // batalkan run — lesson yang sudah diterjemahkan TETAP tersimpan, dan
    // sync berikutnya hanya mengulang yang belum (idempotent via contentHash).
    let consecutiveFailures = 0;
    for (let i = 0; i < scanned.length; i++) {
      const lesson = scanned[i];
      const result = await translateMarkdown(lesson.contentMd, {
        apiKey: geminiKey,
        doNotTranslate: glossary.doNotTranslate,
      });
      if (result.translated) {
        lesson.contentMd = result.markdown;
        translated += 1;
        engineUsed = result.engine ?? engineUsed;
        consecutiveFailures = 0;
      } else {
        untranslated += 1;
        consecutiveFailures += 1;
        warnings.push(
          `${lesson.sourcePath}: terjemahan gagal (${result.reason}); disimpan English`,
        );
        if (consecutiveFailures >= 15) {
          // Berhenti menerjemahkan, TAPI tetap lanjut ke tulis DB: lesson yang
          // sudah diterjemahkan tersimpan, sisanya tetap English dan dicoba
          // lagi di sync berikut (idempotent via contentHash).
          warnings.push(
            `Circuit breaker: 15 lesson beruntun gagal diterjemahkan (${result.reason}). ` +
              `Kemungkinan rate limit endpoint terjemahan. ${translated} lesson sudah diterjemahkan ` +
              `di run ini; ${scanned.length - (i + 1)} lesson belum dicoba dan tetap English.`,
          );
          untranslated += scanned.length - (i + 1);
          break;
        }
      }
      if ((i + 1) % 50 === 0) {
        console.log(`  ... ${i + 1}/${scanned.length} lesson diterjemahkan`);
      }
      await sleep(TRANSLATE_DELAY_MS);
    }
    if (!geminiKey) {
      warnings.push(
        `Terjemahan memakai Google Translate (tanpa key); GEMINI_API_KEY tidak diset`,
      );
    }
  }

  // ---------- Report: fase & total ----------
  const phaseSummary = new Map<string, { title: string; lessons: number }>();
  for (const lesson of scanned) {
    const meta = phasesMeta[String(lesson.phaseNumber)];
    const title = meta?.title ?? titleCaseFromSlug(lesson.phaseDir);
    const entry = phaseSummary.get(lesson.phaseSlug) ?? { title, lessons: 0 };
    entry.lessons += 1;
    phaseSummary.set(lesson.phaseSlug, entry);
  }
  const totalEstimatedMinutes = scanned.reduce(
    (sum, l) => sum + (l.estimatedMinutes ?? 0),
    0,
  );

  // ---------- Pengaman 80% (baca saja; tanpa tulis di dry-run) ----------
  let dbActive = 0;
  try {
    dbActive = await prisma.lesson.count({ where: { isActive: true } });
  } catch (err) {
    warnings.push(
      `Pengaman dilewati: DB tidak bisa dibaca (${err instanceof Error ? err.message : String(err)})`,
    );
  }
  if (dbActive > 0 && scanned.length < Math.floor(dbActive * 0.8) && !args.force) {
    throw new Error(
      `Pengaman: hasil scan (${scanned.length}) < 80% dari lesson aktif di DB (${dbActive}). ` +
        `Kemungkinan upstream berubah drastis atau fetch gagal. Jalankan dengan --force bila memang disengaja.`,
    );
  }

  const report: SyncReport = {
    ref: args.ref,
    commitSha: sha,
    dryRun: args.dryRun,
    phases: [...phaseSummary.entries()].map(([slug, v]) => ({
      slug,
      title: v.title,
      lessons: v.lessons,
    })),
    total: scanned.length,
    added: 0,
    updated: 0,
    unchanged: 0,
    skipped,
    deactivated: 0,
    failed: 0,
    translated,
    untranslated,
    totalEstimatedMinutes,
    warnings,
    durationMs: Date.now() - startedMs,
  };

  // ---------- Tulis DB (bukan dry-run) ----------
  if (!args.dryRun) {
    const existing = await prisma.lesson.findMany({
      select: { sourcePath: true, contentHash: true, sortOrder: true },
    });
    const existingByPath = new Map(existing.map((e) => [e.sourcePath, e]));
    const scannedPaths = new Set(scanned.map((l) => l.sourcePath));

    await prisma.$transaction(
      async (tx) => {
        // Fase
        for (const [slug, v] of phaseSummary.entries()) {
          const phaseNumber = scanned.find((l) => l.phaseSlug === slug)!.phaseNumber;
          const meta = phasesMeta[String(phaseNumber)];
          await tx.phase.upsert({
            where: { slug },
            create: {
              slug,
              number: phaseNumber,
              title: v.title,
              tagline: meta?.tagline ?? null,
              isActive: true,
            },
            update: {
              number: phaseNumber,
              title: v.title,
              tagline: meta?.tagline ?? null,
              isActive: true,
            },
          });
        }
        // Lesson
        let sortOrder = 0;
        for (const lesson of scanned) {
          sortOrder += 1;
          const hash = contentHash(lesson);
          const prev = existingByPath.get(lesson.sourcePath);
          const phase = await tx.phase.findUniqueOrThrow({
            where: { slug: lesson.phaseSlug },
            select: { id: true },
          });
          if (prev && prev.contentHash === hash) {
            report.unchanged += 1;
            if (prev.sortOrder !== sortOrder) {
              await tx.lesson.update({
                where: { sourcePath: lesson.sourcePath },
                data: { sortOrder },
              });
            }
            continue;
          }
          const data = {
            phaseId: phase.id,
            slug: lesson.lessonSlug,
            number: lesson.lessonNumber,
            title: lesson.title,
            motto: lesson.motto,
            type: lesson.type,
            languages: lesson.languages,
            prerequisites: lesson.prerequisites,
            estimatedMinutes: lesson.estimatedMinutes,
            contentMd: lesson.contentMd,
            sourcePath: lesson.sourcePath,
            sourceSha: sha,
            contentHash: hash,
            sortOrder,
            isActive: true,
          };
          if (prev) {
            await tx.lesson.update({ where: { sourcePath: lesson.sourcePath }, data });
            report.updated += 1;
          } else {
            await tx.lesson.create({ data });
            report.added += 1;
          }
        }
        // Nonaktifkan lesson yang hilang dari upstream
        const gone = existing.filter((e) => !scannedPaths.has(e.sourcePath));
        if (gone.length > 0) {
          await tx.lesson.updateMany({
            where: { sourcePath: { in: gone.map((g) => g.sourcePath) } },
            data: { isActive: false },
          });
          report.deactivated = gone.length;
        }
        // Nonaktifkan fase tanpa lesson aktif
        const activePhaseIds = new Set(
          scanned.map((l) => l.phaseSlug),
        );
        await tx.phase.updateMany({
          where: { slug: { notIn: [...activePhaseIds] } },
          data: { isActive: false },
        });
      },
      { timeout: 180_000, maxWait: 30_000 },
    );
  }

  report.durationMs = Date.now() - startedMs;

  // ---------- ContentSync ----------
  if (!args.dryRun) {
    const finishedAt = new Date();
    await prisma.contentSync.create({
      data: {
        repoUrl,
        ref: args.ref,
        sha,
        phases: report.phases.length,
        lessonsActive: report.total,
        lessonsSkipped: report.skipped,
        report: JSON.parse(JSON.stringify(report)) as object,
        createdAt: finishedAt,
      },
    });
  }

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(`\nGAGAL: ${err instanceof Error ? err.message : String(err)}`);
  try {
    await prisma.$disconnect();
  } catch {
    // abaikan
  }
  process.exit(1);
});
