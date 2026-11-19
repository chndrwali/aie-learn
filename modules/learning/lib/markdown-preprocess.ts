/**
 * Pra-proses markdown materi sebelum ReactMarkdown.
 *
 * Upstream memakai pagar ```math untuk rumus display (LaTeX), sementara
 * remark-math hanya mengenal $...$ / $$...$$. Blok itu diubah jadi
 * $$...$$ di sini. Pagar lain (```mermaid, ```figure, kode biasa)
 * DIBIARKAN — ditangani komponen renderer masing-masing.
 */
export function preprocessMarkdown(md: string): string {
  return md.replace(
    /^```math[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm,
    (_match, body: string) => `$$\n${body.trim()}\n$$`,
  );
}
