import { describe, expect, it } from "vitest";
import { preprocessMarkdown } from "./markdown-preprocess";

describe("preprocessMarkdown", () => {
  it("mengubah pagar ```math menjadi display math $$...$$", () => {
    const md = [
      "Teks sebelum.",
      "",
      "```math",
      "\\begin{aligned}",
      "a &= b \\\\",
      "\\end{aligned}",
      "```",
      "",
      "Teks sesudah.",
    ].join("\n");
    expect(preprocessMarkdown(md)).toBe(
      [
        "Teks sebelum.",
        "",
        "$$",
        "\\begin{aligned}",
        "a &= b \\\\",
        "\\end{aligned}",
        "$$",
        "",
        "Teks sesudah.",
      ].join("\n"),
    );
  });

  it("membiarkan pagar lain (mermaid, figure, kode) apa adanya", () => {
    const md = [
      "```mermaid",
      "graph TD",
      "  A-->B",
      "```",
      "",
      "```figure",
      "eigen-directions",
      "```",
      "",
      "```python",
      "print(1)",
      "```",
    ].join("\n");
    expect(preprocessMarkdown(md)).toBe(md);
  });

  it("mengubah beberapa blok math sekaligus", () => {
    const md = "```math\nx = 1\n```\n\n```math\ny = 2\n```";
    expect(preprocessMarkdown(md)).toBe("$$\nx = 1\n$$\n\n$$\ny = 2\n$$");
  });
});
