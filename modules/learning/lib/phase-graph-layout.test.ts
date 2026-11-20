import { describe, expect, it } from "vitest";
import graph from "@/content-meta/phase-graph.json";
import { layoutPhaseGraph } from "./phase-graph-layout";

describe("layoutPhaseGraph", () => {
  it("graf asli: 20 simpul, kedalaman maks 12, Fase 3 di 3, Fase 19 di 12", () => {
    const layout = layoutPhaseGraph(graph.edges);
    expect(layout.nodes).toHaveLength(20);
    expect(layout.maxDepth).toBe(12);
    const depthOf = (n: number) =>
      layout.nodes.find((node) => node.number === n)?.depth;
    expect(depthOf(0)).toBe(0);
    expect(depthOf(3)).toBe(3);
    expect(depthOf(19)).toBe(12);
    expect(layout.layerWidths).toEqual([1, 1, 1, 1, 4, 1, 2, 2, 1, 1, 2, 2, 1]);
  });

  it("layerIndex urut nomor dalam lapisan", () => {
    const layout = layoutPhaseGraph(graph.edges);
    const layer4 = layout.nodes
      .filter((n) => n.depth === 4)
      .sort((a, b) => a.layerIndex - b.layerIndex)
      .map((n) => n.number);
    expect(layer4).toEqual([4, 5, 6, 9]);
  });

  it("graf kecil: kedalaman = jalur terpanjang", () => {
    // 0→1→3 dan 0→2→3→4: simpul 3 di kedalaman 2, simpul 4 di 3.
    const layout = layoutPhaseGraph([
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ]);
    const depthOf = (n: number) =>
      layout.nodes.find((node) => node.number === n)?.depth;
    expect(depthOf(3)).toBe(2);
    expect(depthOf(4)).toBe(3);
    expect(layout.maxDepth).toBe(3);
  });

  it("siklus → throw", () => {
    expect(() =>
      layoutPhaseGraph([
        [0, 1],
        [1, 0],
      ]),
    ).toThrow("siklus");
  });
});
