import { describe, expect, it } from "vitest";
import { buildCatalog, rewriteLinks } from "./rewrite-links";

const SHA = "abc123def456";
const catalog = buildCatalog([
  {
    phaseSlug: "00-setup-and-tooling",
    lessonSlug: "01-dev-environment",
    sourcePath: "phases/00-setup-and-tooling/01-dev-environment",
  },
  {
    phaseSlug: "00-setup-and-tooling",
    lessonSlug: "02-other-lesson",
    sourcePath: "phases/00-setup-and-tooling/02-other-lesson",
  },
  {
    phaseSlug: "03-deep-learning-core",
    lessonSlug: "01-perceptron",
    sourcePath: "phases/03-deep-learning-core/01-perceptron",
  },
]);

const CURRENT = "phases/00-setup-and-tooling/01-dev-environment";

function run(md: string) {
  return rewriteLinks(md, { catalog, sourcePath: CURRENT, sha: SHA });
}

describe("rewriteLinks", () => {
  it("link relatif ke lesson di katalog -> /learn", () => {
    const { markdown, stats } = run(
      "Lihat [lesson berikut](../02-other-lesson) dulu.",
    );
    expect(markdown).toContain("(/learn/00-setup-and-tooling/02-other-lesson)");
    expect(stats.internal).toBe(1);
  });

  it("link relatif ../<fase>/<lesson> lintas fase -> /learn", () => {
    const { markdown } = run(
      "Lanjut ke [perceptron](../../03-deep-learning-core/01-perceptron).",
    );
    expect(markdown).toContain("(/learn/03-deep-learning-core/01-perceptron)");
  });

  it("link relatif ke lesson yang TIDAK ada -> GitHub blob/<sha>", () => {
    const { markdown, stats } = run("Cek [yang hilang](../99-missing-lesson).");
    expect(markdown).toContain(
      `(https://github.com/rohitg00/ai-engineering-from-scratch/blob/${SHA}/phases/00-setup-and-tooling/99-missing-lesson)`,
    );
    expect(stats.githubFallback).toBe(1);
  });

  it("URL blob GitHub di katalog -> /learn; di luar katalog -> blob/<sha>", () => {
    const { markdown } = run(
      "A [satu](https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/phases/03-deep-learning-core/01-perceptron) dan [dua](https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/phases/99-unknown/01-x).",
    );
    expect(markdown).toContain("(/learn/03-deep-learning-core/01-perceptron)");
    expect(markdown).toContain(
      `(https://github.com/rohitg00/ai-engineering-from-scratch/blob/${SHA}/phases/99-unknown/01-x)`,
    );
  });

  it("URL situs lesson -> /learn", () => {
    const { markdown } = run(
      "Buka [sini](https://aiengineeringfromscratch.com/lesson?path=phases%2F03-deep-learning-core%2F01-perceptron).",
    );
    expect(markdown).toContain("(/learn/03-deep-learning-core/01-perceptron)");
  });

  it("link relatif ke file code -> GitHub blob/<sha>/<path>", () => {
    const { markdown } = run("Lihat [kode](code/main.py) ini.");
    expect(markdown).toContain(
      `(https://github.com/rohitg00/ai-engineering-from-scratch/blob/${SHA}/phases/00-setup-and-tooling/01-dev-environment/code/main.py)`,
    );
  });

  it("gambar relatif -> raw.githubusercontent/<sha>/<path>", () => {
    const { markdown, stats } = run("![diagram](images/diagram.png)");
    expect(markdown).toContain(
      `(https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/${SHA}/phases/00-setup-and-tooling/01-dev-environment/images/diagram.png)`,
    );
    expect(stats.images).toBe(1);
  });

  it("link eksternal dan #anchor tidak berubah", () => {
    const { markdown } = run(
      "Kunjungi [Google](https://google.com) atau [lompat](#bagian).",
    );
    expect(markdown).toContain("(https://google.com)");
    expect(markdown).toContain("(#bagian)");
  });

  it("link di dalam code fence TIDAK berubah", () => {
    const { markdown } = run(
      "```\n[contoh](../02-other-lesson)\n```\n\nTeks [nyata](../02-other-lesson).",
    );
    expect(markdown).toContain("[contoh](../02-other-lesson)");
    expect(markdown).toContain("(/learn/00-setup-and-tooling/02-other-lesson)");
  });

  it("fragment dipertahankan pada link internal", () => {
    const { markdown } = run("[bagian](../02-other-lesson/docs/en.md#instalasi)");
    expect(markdown).toContain(
      "(/learn/00-setup-and-tooling/02-other-lesson#instalasi)",
    );
  });
});
