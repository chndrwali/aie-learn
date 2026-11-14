/**
 * rewrite-links.ts — Pass 2 ingest: tulis ulang link di contentMd.
 *
 * Diproses via AST markdown (remark), BUKAN regex — link di dalam code fence
 * tidak ikut berubah. Aturan (CONTENT-PIPELINE.md):
 * - Link relatif ke lesson lain yang ada di katalog -> /learn/<fase>/<lesson>
 * - Link ke lesson yang TIDAK ada di katalog -> GitHub blob/<sha>/phases/<f>/<l>
 * - Link relatif ke file lain (code/…, notebook/…, outputs/…) -> GitHub blob/<sha>/<path>
 * - Gambar relatif -> raw.githubusercontent.com/<sha>/<path>
 * - Link eksternal dan #anchor tidak berubah.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import type { Root, Link, Image, Definition } from "mdast";

export interface LessonRef {
  phaseSlug: string;
  lessonSlug: string;
  sourcePath: string; // "phases/<fase>/<lesson>"
}

export type LessonCatalog = Map<string, LessonRef>; // key: sourcePath

export function buildCatalog(lessons: LessonRef[]): LessonCatalog {
  return new Map(lessons.map((l) => [l.sourcePath, l]));
}

export interface RewriteOptions {
  catalog: LessonCatalog;
  /** sourcePath lesson saat ini, mis. "phases/00-setup-and-tooling/01-dev-environment" */
  sourcePath: string;
  /** commit SHA upstream yang sedang di-ingest */
  sha: string;
}

export interface RewriteStats {
  internal: number;
  githubFallback: number;
  images: number;
}

const REPO = "rohitg00/ai-engineering-from-scratch";
const BLOB_BASE = `https://github.com/${REPO}/blob`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`;

/** Normalisasi path relatif terhadap direktori lesson saat ini. */
function resolveRelative(fromDir: string, rel: string): string {
  const parts = fromDir.split("/").filter(Boolean);
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/** "phases/<f>/<l>" atau "phases/<f>/<l>/docs/en.md" -> "phases/<f>/<l>" | null */
function lessonDirOf(path: string): string | null {
  const m = path.match(/^(phases\/[^/]+\/[^/]+)(?:\/docs\/en\.md)?$/);
  return m ? m[1] : null;
}

function lessonUrl(ref: LessonRef): string {
  return `/learn/${ref.phaseSlug}/${ref.lessonSlug}`;
}

function rewriteUrl(
  url: string,
  isImage: boolean,
  opts: RewriteOptions,
): { url: string; kind: "internal" | "github" | "image" | "unchanged" } {
  const { catalog, sourcePath, sha } = opts;

  // Anchor / mailto / skema lain: tidak berubah
  if (url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url)) {
    // Kecuali dua pola yang memang harus ditulis ulang (di bawah)
    if (!/^https?:\/\//i.test(url)) return { url, kind: "unchanged" };
  }

  // Pisahkan fragment (#...) agar path bisa di-resolve bersih
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const bare = hashIndex >= 0 ? url.slice(0, hashIndex) : url;

  // 1) URL blob GitHub -> lesson
  const blobMatch = bare.match(
    new RegExp(
      `^https://github\\.com/${REPO.replace("/", "\\/")}/blob/[^/]+/(phases/[^/]+/[^/]+)(?:/docs/en\\.md)?$`,
    ),
  );
  if (blobMatch) {
    const ref = catalog.get(blobMatch[1]);
    if (ref) return { url: lessonUrl(ref) + hash, kind: "internal" };
    return {
      url: `${BLOB_BASE}/${sha}/${blobMatch[1]}${hash}`,
      kind: "github",
    };
  }

  // 2) URL situs aiengineeringfromscratch.com/lesson?path=phases%2F<f>%2F<l>
  const siteMatch = bare.match(
    /^https:\/\/aiengineeringfromscratch\.com\/lesson\?path=phases%2F([^%&]+)%2F([^%&]+)$/i,
  );
  if (siteMatch) {
    const dir = `phases/${decodeURIComponent(siteMatch[1])}/${decodeURIComponent(siteMatch[2])}`;
    const ref = catalog.get(dir);
    if (ref) return { url: lessonUrl(ref) + hash, kind: "internal" };
    return { url: `${BLOB_BASE}/${sha}/${dir}${hash}`, kind: "github" };
  }

  // 3) URL eksternal lain: tidak berubah
  if (/^https?:\/\//i.test(bare)) return { url, kind: "unchanged" };

  // 4) Link relatif (../, ./, atau bare path)
  if (bare === "") return { url, kind: "unchanged" };
  // Link relatif di-resolve terhadap DIREKTORI lesson (sourcePath itu sendiri),
  // sesuai definisi di CONTENT-PIPELINE.md: "../NN-xxx" berarti lesson lain
  // di fase yang sama.
  const fromDir = sourcePath;
  const resolved = resolveRelative(fromDir, bare);
  const lessonDir = lessonDirOf(resolved);

  if (lessonDir) {
    const ref = catalog.get(lessonDir);
    if (ref) return { url: lessonUrl(ref) + hash, kind: "internal" };
    return { url: `${BLOB_BASE}/${sha}/${lessonDir}${hash}`, kind: "github" };
  }

  // File lain di repo (code/, notebook/, gambar, …)
  if (isImage) {
    return { url: `${RAW_BASE}/${sha}/${resolved}${hash}`, kind: "image" };
  }
  return { url: `${BLOB_BASE}/${sha}/${resolved}${hash}`, kind: "github" };
}

/**
 * Tulis ulang semua link & gambar di markdown. Kembalikan markdown hasil
 * stringify AST beserta statistik.
 */
export function rewriteLinks(
  markdown: string,
  opts: RewriteOptions,
): { markdown: string; stats: RewriteStats } {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  const stats: RewriteStats = { internal: 0, githubFallback: 0, images: 0 };

  visit(tree, ["link", "image", "definition"], (node) => {
    const linkNode = node as Link | Image | Definition;
    const isImage = linkNode.type === "image";
    const result = rewriteUrl(linkNode.url, isImage, opts);
    if (result.kind === "unchanged") return;
    linkNode.url = result.url;
    if (result.kind === "internal") stats.internal += 1;
    else if (result.kind === "github") stats.githubFallback += 1;
    else if (result.kind === "image") stats.images += 1;
  });

  const out = unified().use(remarkStringify).stringify(tree);
  return { markdown: out, stats };
}
