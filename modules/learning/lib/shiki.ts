import { createHighlighter, type Highlighter } from "shiki";
import type { Element, Root, Text } from "hast";

/**
 * Highlight kode server-side (sync) dengan Shiki.
 *
 * Kenapa bukan `@shikijs/rehype`: transformer-nya async (lazy highlighter)
 * dan ReactMarkdown menjalankan plugin rehype secara sinkron — sudah
 * diverifikasi gagal (`runSync finished async`). Plugin di sini memakai
 * highlighter yang dibuat sekali (top-level di MarkdownRenderer) sehingga
 * transform-nya sinkron.
 *
 * Tema ganda: `codeToHast` menulis warna terang sebagai `color:` inline
 * dan warna gelap sebagai `--shiki-dark:`. Supaya warna ikut tema, plugin
 * menulis ulang `color:` menjadi `--shiki-light:` (variabel saja); aturan
 * CSS di `globals.css` (`.shiki-code span`) yang memilih variabel sesuai
 * tema. Latar blok kode diatur CodeBlock (bg-muted), bukan Shiki.
 */

// Bahasa yang muncul di korpus (dihitung dari .manual/en, T7). Di luar
// daftar ini blok dibiarkan tanpa highlight (fallback polos).
const HIGHLIGHT_LANGUAGES = [
  "python",
  "bash",
  "shell",
  "sh",
  "zsh",
  "json",
  "jsonc",
  "markdown",
  "c",
  "typescript",
  "javascript",
  "yaml",
  "http",
  "console",
  "dockerfile",
  "toml",
  "julia",
  "asm",
  "sql",
  "html",
  "css",
  "diff",
  "plaintext",
  "text",
];

// Ditangani komponen lain / bukan kode: jangan di-highlight.
const SKIP_LANGUAGES = new Set(["mermaid", "figure", "math", ""]);

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: HIGHLIGHT_LANGUAGES,
  });
  return highlighterPromise;
}

function languageOf(code: Element): string {
  const className = code.properties?.className;
  const classes = Array.isArray(className) ? className : [];
  const langClass = classes.find(
    (c): c is string => typeof c === "string" && c.startsWith("language-"),
  );
  return langClass ? langClass.slice("language-".length) : "";
}

function codeText(code: Element): string {
  const first = code.children[0];
  return first && first.type === "text" ? (first as Text).value : "";
}

/** `color:#xxx` inline → `--shiki-light:#xxx`; sisanya dipertahankan. */
function rewriteSpanStyles(node: Element): void {
  if (node.properties?.style && typeof node.properties.style === "string") {
    const declarations = node.properties.style
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [prop, ...rest] = d.split(":");
        const value = rest.join(":").trim();
        if (prop.trim() === "color") return `--shiki-light:${value}`;
        return d;
      });
    node.properties.style = declarations.join(";");
  }
  for (const child of node.children) {
    if (child.type === "element") rewriteSpanStyles(child as Element);
  }
}

/**
 * Plugin rehype sinkron: ganti isi `<pre><code class="language-x">`
 * dengan hasil `codeToHast` (span berwarna). Blok yang dilewati: tanpa
 * bahasa, bahasa di SKIP_LANGUAGES, atau bahasa yang tidak dimuat
 * (fallback: tampil polos, tanpa error).
 */
export function rehypeShikiSync(highlighter: Highlighter) {
  const loaded = new Set(highlighter.getLoadedLanguages());
  return (tree: Root): void => {
    const visit = (node: Element | Root): void => {
      const children = node.children ?? [];
      for (const child of children) {
        if (child.type !== "element") continue;
        const el = child as Element;
        if (el.tagName === "pre") {
          const code = el.children.find(
            (c): c is Element => c.type === "element" && c.tagName === "code",
          );
          if (code) {
            const lang = languageOf(code);
            if (!SKIP_LANGUAGES.has(lang) && loaded.has(lang)) {
              try {
                const hast = highlighter.codeToHast(codeText(code), {
                  lang,
                  themes: { light: "github-light", dark: "github-dark" },
                });
                const newPre = hast.children.find(
                  (c): c is Element =>
                    c.type === "element" && c.tagName === "pre",
                );
                const newCode = newPre?.children.find(
                  (c): c is Element =>
                    c.type === "element" && c.tagName === "code",
                );
                if (newCode) {
                  rewriteSpanStyles(newCode);
                  const classes = Array.isArray(code.properties?.className)
                    ? (code.properties.className as string[])
                    : [];
                  newCode.properties = {
                    ...code.properties,
                    className: [...classes, "shiki-code"],
                  };
                  el.children = [newCode];
                }
              } catch {
                // Bahasa gagal di-highlight: biarkan blok tampil polos.
              }
            }
          }
        }
        visit(el);
      }
    };
    visit(tree);
  };
}
