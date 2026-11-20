/**
 * Tata letak peta kurikulum (DESIGN.md §5): layered DAG dari
 * `content-meta/phase-graph.json`. Sumbu X = kedalaman (jalur terpanjang
 * dari Fase 0), sumbu Y = urutan dalam lapisan. Fungsi murni — tanpa I/O.
 * Koordinat piksel dihitung komponen `PhaseMap` dari depth/layerIndex.
 */

export type PhaseGraphEdge = readonly [number, number];

export type PhaseGraphNode = {
  number: number;
  depth: number;
  layerIndex: number;
};

export type PhaseGraphLayout = {
  nodes: PhaseGraphNode[];
  edges: { from: number; to: number }[];
  maxDepth: number;
  layerWidths: number[];
};

export function layoutPhaseGraph(
  edges: readonly (readonly number[])[],
): PhaseGraphLayout {
  const tuples: PhaseGraphEdge[] = edges.map((edge) => {
    if (edge.length !== 2) {
      throw new Error("setiap sisi phase-graph harus punya 2 simpul");
    }
    return [edge[0], edge[1]];
  });
  const numbers = new Set<number>();
  const predecessors = new Map<number, number[]>();
  const successors = new Map<number, number[]>();
  for (const [from, to] of tuples) {
    numbers.add(from);
    numbers.add(to);
    predecessors.set(to, [...(predecessors.get(to) ?? []), from]);
    successors.set(from, [...(successors.get(from) ?? []), to]);
  }

  // Kahn: urutan topologis + kedalaman = jalur terpanjang dari sumber.
  const inDegree = new Map<number, number>();
  for (const n of numbers) {
    inDegree.set(n, (predecessors.get(n) ?? []).length);
  }
  const queue = [...numbers]
    .filter((n) => (inDegree.get(n) ?? 0) === 0)
    .sort((a, b) => a - b);
  const depth = new Map<number, number>();
  for (const n of numbers) depth.set(n, 0);
  const order: number[] = [];
  while (queue.length > 0) {
    const n = queue.shift() as number;
    order.push(n);
    for (const next of successors.get(n) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, (depth.get(n) ?? 0) + 1));
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  if (order.length !== numbers.size) {
    throw new Error("phase-graph.json mengandung siklus");
  }

  const byDepth = new Map<number, number[]>();
  for (const n of [...numbers].sort((a, b) => a - b)) {
    const d = depth.get(n) ?? 0;
    byDepth.set(d, [...(byDepth.get(d) ?? []), n]);
  }
  const maxDepth = Math.max(0, ...depth.values());
  const layerWidths = Array.from({ length: maxDepth + 1 }, (_, d) =>
    byDepth.has(d) ? (byDepth.get(d) as number[]).length : 0,
  );
  const nodes: PhaseGraphNode[] = [...numbers]
    .sort((a, b) => a - b)
    .map((n) => ({
      number: n,
      depth: depth.get(n) ?? 0,
      layerIndex: (byDepth.get(depth.get(n) ?? 0) as number[]).indexOf(n),
    }));

  return {
    nodes,
    edges: tuples.map(([from, to]) => ({ from, to })),
    maxDepth,
    layerWidths,
  };
}
