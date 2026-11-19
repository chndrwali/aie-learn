import GithubSlugger from "github-slugger";

export type TocHeading = { id: string; text: string; level: number };

/**
 * Ambil heading h2/h3 dari markdown untuk LessonToc.
 *
 * Id memakai GithubSlugger yang sama dengan rehype-slug, termasuk
 * penomoran duplikat (-1, -2), supaya tautan TOC cocok dengan id
 * heading hasil render. Baris di dalam pagar kode (``` / ~~~)
 * dilewati — contoh "## komentar" di dalam kode bukan heading.
 */
function plainText(inline: string): string {
  return inline
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function extractHeadings(md: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const out: TocHeading[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = plainText(match[2]);
    if (!text) continue;
    out.push({ id: slugger.slug(text), text, level: match[1].length });
  }
  return out;
}
