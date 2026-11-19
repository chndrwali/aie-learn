import { getHighlighter, rehypeShikiSync } from "@/modules/learning/lib/shiki";
import { preprocessMarkdown } from "@/modules/learning/lib/markdown-preprocess";
import { CodeBlock } from "@/modules/learning/ui/components/code-block";
import { FigurePlaceholder } from "@/modules/learning/ui/components/figure-placeholder";
import { MermaidBlock } from "@/modules/learning/ui/components/mermaid-block";
import type { Element } from "hast";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Renderer markdown materi (RSC, sesuai front-end-flow.md + keputusan T3):
 * - remark-gfm (tabel, dsb.), remark-math + KaTeX (rumus inline $...$ dan
 *   display $$...$$; pagar ```math diubah jadi $$...$$ di preprocess).
 * - rehype-slug + autolink headings (hanya h2/h3 masuk TOC).
 * - Shiki server-side via plugin sync (lib/shiki.ts).
 * - Raw HTML TIDAK dirender (tanpa rehype-raw, sesuai AGENTS.md).
 * - Link internal (/learn/..., /curriculum/...) pakai next/link; eksternal
 *   target _blank + rel noopener noreferrer.
 * - Gambar lazy, max-width 100%, alt dipertahankan.
 */

function codeChild(node: Element | undefined): Element | undefined {
  return node?.children.find(
    (c): c is Element => c.type === "element" && c.tagName === "code",
  );
}

function languageOf(node: Element | undefined): string | null {
  const code = codeChild(node);
  const className = code?.properties?.className;
  const classes = Array.isArray(className) ? className : [];
  const langClass = classes.find(
    (c): c is string => typeof c === "string" && c.startsWith("language-"),
  );
  return langClass ? langClass.slice("language-".length) : null;
}

/** Teks mentah isi blok kode — hanya valid bila blok tidak di-highlight. */
function rawTextOf(node: Element | undefined): string {
  const code = codeChild(node);
  const first = code?.children[0];
  return first && first.type === "text" ? first.value : "";
}

const headingLink = {
  type: "element",
  tagName: "span",
  properties: {
    className: [
      "ml-2",
      "text-base",
      "text-muted-foreground",
      "opacity-0",
      "transition-opacity",
      "group-hover:opacity-100",
      "group-focus-within:opacity-100",
    ],
  },
  children: [{ type: "text", value: "#" }],
} as const;

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 font-sans text-4xl leading-[1.15] font-semibold tracking-[-0.01em]">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2
      id={id}
      className="group mt-10 mb-4 scroll-mt-20 font-sans text-[26px] leading-[1.25] font-semibold tracking-[-0.01em]"
    >
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3
      id={id}
      className="group mt-8 mb-3 scroll-mt-20 font-sans text-xl leading-[1.35] font-semibold tracking-[-0.01em]"
    >
      {children}
    </h3>
  ),
  h4: ({ children, id }) => (
    <h4
      id={id}
      className="group mt-6 mb-2 scroll-mt-20 font-sans text-lg leading-snug font-semibold"
    >
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="my-[1.1em] leading-[1.7]">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
  a: ({ href, children, className }) => {
    if (typeof className === "string" && className.includes("anchor")) {
      return (
        <a href={href} className={className} aria-hidden="true" tabIndex={-1}>
          {children}
        </a>
      );
    }
    const linkClass =
      "text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary";
    if (href?.startsWith("#")) {
      return (
        <a href={href} className={linkClass}>
          {children}
        </a>
      );
    }
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={linkClass}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      className="my-6 max-w-full rounded-lg border"
    />
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse font-sans text-sm [&_tr:last-child_td]:border-b-0">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b bg-muted/50 px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b px-4 py-2 align-top">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-r-lg border-l-4 border-primary/60 bg-muted/40 px-4 py-3 [&>p]:my-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  code: ({ className, children }) => {
    const hasLanguage =
      typeof className === "string" && className.includes("language-");
    if (hasLanguage) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
  pre: ({ node, children }) => {
    const lang = languageOf(node);
    if (lang === "mermaid") {
      return <MermaidBlock code={rawTextOf(node)} />;
    }
    if (lang === "figure") {
      return <FigurePlaceholder figureId={rawTextOf(node)} />;
    }
    return <CodeBlock language={lang ?? "kode"}>{children}</CodeBlock>;
  },
};

export async function MarkdownRenderer({ content }: { content: string }) {
  const highlighter = await getHighlighter();
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "append",
            content: headingLink,
            properties: { className: ["anchor"], ariaLabel: "Tautan ke bagian ini" },
          },
        ],
        rehypeKatex,
        // Plugin (bukan transformer): unified memanggil rehypeShikiSync
        // dengan highlighter sebagai argumen, lalu memakai hasil kembalinya
        // sebagai transformer. Menulis rehypeShikiSync(highlighter) di
        // sini SALAH — unified akan memanggil transformer itu tanpa argumen.
        [rehypeShikiSync, highlighter],
      ]}
      components={components}
    >
      {preprocessMarkdown(content)}
    </ReactMarkdown>
  );
}
