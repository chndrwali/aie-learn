import { describe, expect, it } from "vitest";
import { createHighlighter } from "shiki";
import type { Element, Root } from "hast";
import { rehypeShikiSync } from "./shiki";

function codeBlock(lang: string | null, text: string): Element {
  return {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties:
          lang === null ? {} : { className: [`language-${lang}`] },
        children: [{ type: "text", value: text }],
      },
    ],
  };
}

function treeWith(block: Element): Root {
  return { type: "root", children: [block] };
}

describe("rehypeShikiSync", () => {
  it("meng-highlight blok python (span + variabel tema, tanpa color inline)", async () => {
    const highlighter = await createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["python"],
    });
    const block = codeBlock("python", "print('hi')");
    rehypeShikiSync(highlighter)(treeWith(block));
    const code = block.children[0] as Element;
    expect((code.properties?.className as string[]) ?? []).toContain(
      "shiki-code",
    );
    // Cari span token pertama yang membawa style (span .line pembungkus
    // tidak punya style).
    const findStyled = (el: Element): Element | null => {
      if (typeof el.properties?.style === "string") return el;
      for (const child of el.children) {
        if (child.type === "element") {
          const found = findStyled(child as Element);
          if (found) return found;
        }
      }
      return null;
    };
    const tokenSpan = findStyled(code);
    expect(tokenSpan).not.toBeNull();
    const style = String(tokenSpan?.properties?.style ?? "");
    expect(style).toContain("--shiki-light:");
    expect(style).not.toMatch(/(^|;)color:/);
  });

  it("membiarkan blok mermaid dan figure apa adanya", async () => {
    const highlighter = await createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["python"],
    });
    for (const lang of ["mermaid", "figure"]) {
      const block = codeBlock(lang, "graph TD\n  A-->B");
      rehypeShikiSync(highlighter)(treeWith(block));
      const code = block.children[0] as Element;
      expect(code.children).toEqual([
        { type: "text", value: "graph TD\n  A-->B" },
      ]);
    }
  });

  it("membiarkan bahasa tak dikenal dan blok tanpa bahasa (fallback polos)", async () => {
    const highlighter = await createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["python"],
    });
    for (const lang of ["nosuchlang123", null]) {
      const block = codeBlock(lang, "xyz");
      rehypeShikiSync(highlighter)(treeWith(block));
      const code = block.children[0] as Element;
      expect(code.children).toEqual([{ type: "text", value: "xyz" }]);
    }
  });
});
