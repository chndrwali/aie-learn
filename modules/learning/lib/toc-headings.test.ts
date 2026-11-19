import { describe, expect, it } from "vitest";
import { extractHeadings } from "./toc-headings";

describe("extractHeadings", () => {
  it("mengambil h2/h3 dengan id gaya rehype-slug", () => {
    const md = [
      "# Judul (bukan TOC)",
      "",
      "## Tujuan Pembelajaran",
      "",
      "### Langkah Pertama",
      "",
      "## Masalahnya",
    ].join("\n");
    expect(extractHeadings(md)).toEqual([
      { id: "tujuan-pembelajaran", text: "Tujuan Pembelajaran", level: 2 },
      { id: "langkah-pertama", text: "Langkah Pertama", level: 3 },
      { id: "masalahnya", text: "Masalahnya", level: 2 },
    ]);
  });

  it("menomori heading duplikat seperti rehype-slug", () => {
    const md = "## Bangun\n\n## Bangun\n\n## Bangun";
    expect(extractHeadings(md).map((h) => h.id)).toEqual([
      "bangun",
      "bangun-1",
      "bangun-2",
    ]);
  });

  it("mengupas markup inline dari teks dan id", () => {
    const md = "## Memakai `useState` dan [dokumen](https://x.test) ##";
    expect(extractHeadings(md)).toEqual([
      {
        id: "memakai-usestate-dan-dokumen",
        text: "Memakai useState dan dokumen",
        level: 2,
      },
    ]);
  });

  it("melewati heading di dalam pagar kode", () => {
    const md = [
      "## Asli",
      "",
      "```python",
      "## bukan heading",
      "print('## juga bukan')",
      "```",
      "",
      "### Asli Juga",
    ].join("\n");
    expect(extractHeadings(md)).toEqual([
      { id: "asli", text: "Asli", level: 2 },
      { id: "asli-juga", text: "Asli Juga", level: 3 },
    ]);
  });
});
