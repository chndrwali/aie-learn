/**
 * parse-lesson.ts — Pass 1 ingest: ekstrak metadata dari docs/en.md upstream.
 *
 * Pure function, tanpa I/O. Aturan (CONTENT-PIPELINE.md):
 * - Judul: heading `# ` pertama; fallback Title Case dari slug + warning.
 * - Motto: baris `> ...` pertama setelah H1.
 * - Type: `**Type:**` Build|Learn (case-insensitive); selain itu null.
 * - Languages: `**Languages:**` dipisah koma.
 * - Prerequisites: `**Prerequisites:**` teks mentah.
 * - Time: `**Time:**` angka pertama; jam dikali 60.
 * - contentMd: mulai dari heading `## ` pertama; jika tidak ada, seluruh isi setelah H1.
 * Parser tidak pernah throw pada format malformed — kembalikan sebagian + warnings.
 */

export type LessonType = "LEARN" | "BUILD";

export interface ParsedLesson {
  title: string;
  motto: string | null;
  type: LessonType | null;
  languages: string[];
  prerequisites: string | null;
  estimatedMinutes: number | null;
  contentMd: string;
  warnings: string[];
}

const META_PATTERNS = {
  type: /\*\*Type:\*\*\s*(.+)/i,
  languages: /\*\*Languages:\*\*\s*(.+)/i,
  prerequisites: /\*\*Prerequisites:\*\*\s*(.+)/i,
  time: /\*\*Time:\*\*\s*(.+)/i,
} as const;

/** "01-dev-environment" -> "Dev Environment" */
export function titleCaseFromSlug(slug: string): string {
  const stripped = slug.replace(/^\d+[-_]/, "").replace(/[-_]+/g, " ");
  return stripped
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseTimeMinutes(raw: string): number | null {
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const isHours = /\b(hours?|hrs?|h)\b/i.test(raw);
  return Math.round(isHours ? value * 60 : value);
}

/**
 * Parse satu file docs/en.md menjadi metadata + konten.
 * @param raw isi markdown mentah
 * @param slug slug lesson (untuk fallback judul), mis. "01-dev-environment"
 */
export function parseLesson(raw: string, slug: string): ParsedLesson {
  const warnings: string[] = [];
  const lines = raw.split("\n");

  // --- H1 ---
  const h1Index = lines.findIndex((l) => /^#\s+\S/.test(l));
  let title: string;
  if (h1Index >= 0) {
    title = lines[h1Index].replace(/^#\s+/, "").trim();
  } else {
    title = titleCaseFromSlug(slug);
    warnings.push("H1 tidak ditemukan; judul memakai fallback dari slug");
  }

  // --- Motto: baris `> ...` pertama setelah H1 ---
  let motto: string | null = null;
  const mottoStart = h1Index >= 0 ? h1Index + 1 : 0;
  for (let i = mottoStart; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*(.+)/);
    if (m) {
      motto = m[1].trim();
      break;
    }
    // Berhenti di heading pertama setelah H1 (motto selalu di atas)
    if (/^##\s/.test(lines[i])) break;
  }

  // --- Blok meta (dicari di seluruh dokumen, biasanya di atas) ---
  const typeMatch = raw.match(META_PATTERNS.type);
  let type: LessonType | null = null;
  if (typeMatch) {
    const value = typeMatch[1].trim();
    if (/^build/i.test(value)) type = "BUILD";
    else if (/^learn/i.test(value)) type = "LEARN";
    else warnings.push(`Type tidak dikenali: "${value}"`);
  }

  const languagesMatch = raw.match(META_PATTERNS.languages);
  const languages = languagesMatch
    ? languagesMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const prereqMatch = raw.match(META_PATTERNS.prerequisites);
  const prerequisites = prereqMatch ? prereqMatch[1].trim() : null;

  const timeMatch = raw.match(META_PATTERNS.time);
  const estimatedMinutes = timeMatch
    ? parseTimeMinutes(timeMatch[1].trim())
    : null;

  // --- contentMd: mulai dari `## ` pertama; fallback seluruh isi setelah H1 ---
  const firstH2 = lines.findIndex((l) => /^##\s+\S/.test(l));
  let contentMd: string;
  if (firstH2 >= 0) {
    contentMd = lines.slice(firstH2).join("\n").trim();
  } else if (h1Index >= 0) {
    contentMd = lines.slice(h1Index + 1).join("\n").trim();
  } else {
    contentMd = raw.trim();
  }

  return {
    title,
    motto,
    type,
    languages,
    prerequisites,
    estimatedMinutes,
    contentMd,
    warnings,
  };
}
