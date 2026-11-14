import { describe, expect, it } from "vitest";
import { parseLesson, titleCaseFromSlug } from "./parse-lesson";

const FULL = `# Dev Environment Setup

> Set up your machine for AI development.

**Type:** Build
**Languages:** Python, TypeScript
**Prerequisites:** Basic computer skills
**Time:** ~45 minutes

## Install Python

Install Python 3.12 from python.org.

## Verify

Run \`python --version\`.
`;

describe("parseLesson", () => {
  it("header lengkap: semua field terisi, contentMd mulai dari H2 pertama", () => {
    const p = parseLesson(FULL, "01-dev-environment");
    expect(p.title).toBe("Dev Environment Setup");
    expect(p.motto).toBe("Set up your machine for AI development.");
    expect(p.type).toBe("BUILD");
    expect(p.languages).toEqual(["Python", "TypeScript"]);
    expect(p.prerequisites).toBe("Basic computer skills");
    expect(p.estimatedMinutes).toBe(45);
    expect(p.contentMd).toMatch(/^## Install Python/);
    expect(p.contentMd).not.toContain("Dev Environment Setup");
    expect(p.warnings).toEqual([]);
  });

  it("Time dalam jam dikali 60; Type case-insensitive", () => {
    const p = parseLesson(
      "# X\n\n**Type:** learn\n**Time:** 2 hours\n\n## A\n\nbody\n",
      "01-x",
    );
    expect(p.type).toBe("LEARN");
    expect(p.estimatedMinutes).toBe(120);
  });

  it("Time desimal jam: 1.5 hours -> 90", () => {
    const p = parseLesson("# X\n\n**Time:** ~1.5 hours\n\n## A\n\nbody\n", "01-x");
    expect(p.estimatedMinutes).toBe(90);
  });

  it("header sebagian: field yang absen jadi null, tanpa warning", () => {
    const p = parseLesson("# Only Title\n\n## Section\n\nSome body.\n", "02-only");
    expect(p.title).toBe("Only Title");
    expect(p.motto).toBeNull();
    expect(p.type).toBeNull();
    expect(p.languages).toEqual([]);
    expect(p.prerequisites).toBeNull();
    expect(p.estimatedMinutes).toBeNull();
    expect(p.contentMd).toMatch(/^## Section/);
    expect(p.warnings).toEqual([]);
  });

  it("tanpa H1: judul fallback Title Case dari slug + warning", () => {
    const p = parseLesson("## Section\n\nBody text.\n", "01-dev-environment");
    expect(p.title).toBe("Dev Environment");
    expect(p.warnings.length).toBeGreaterThan(0);
    expect(p.contentMd).toMatch(/^## Section/);
  });

  it("tanpa H2: contentMd = seluruh isi setelah H1", () => {
    const p = parseLesson("# Title\n\nJust paragraphs.\n\nMore text.\n", "01-x");
    expect(p.contentMd).toContain("Just paragraphs.");
    expect(p.contentMd).not.toContain("# Title");
  });

  it("Type tidak dikenal -> null + warning", () => {
    const p = parseLesson("# X\n\n**Type:** Quiz\n\n## A\n\nbody\n", "01-x");
    expect(p.type).toBeNull();
    expect(p.warnings.length).toBeGreaterThan(0);
  });

  it("titleCaseFromSlug: strip prefix angka", () => {
    expect(titleCaseFromSlug("03-neural-networks")).toBe("Neural Networks");
    expect(titleCaseFromSlug("hello-world")).toBe("Hello World");
  });
});
