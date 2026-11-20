import graph from "@/content-meta/phase-graph.json";
import { layoutPhaseGraph } from "@/modules/learning/lib/phase-graph-layout";
import Link from "next/link";
import type { LessonStatus } from "./progress-mark";

/**
 * Peta kurikulum (DESIGN.md §5): layered DAG dari phase-graph.json, digambar
 * sebagai SVG biasa — tanpa library graf. Sumbu X = kedalaman, sumbu Y =
 * urutan dalam lapisan. Simpul memakai simbol status (○/◐/●); di dalam
 * aplikasi simpul adalah link ke /curriculum/[phase], di landing statis.
 * `< md` peta diganti daftar vertikal (alternatif teks yang setara).
 */

const R = 13;
const X_STEP = 72;
const Y_STEP = 64;
const MARGIN_X = 32;
const MARGIN_Y = 32;

export type PhaseMapPhase = {
  number: number;
  slug: string;
  title: string;
};

export type PhaseMapStatus = {
  status: LessonStatus;
  completed: number;
  total: number;
};

function NodeMark({ status }: { status: LessonStatus }) {
  if (status === "COMPLETED") {
    return (
      <>
        <circle r={R} className="fill-primary" />
        <path
          d="M -5 0 L -1.5 3.5 L 5.5 -4"
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary-foreground"
        />
      </>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <>
        <path
          d={`M 0 ${-R} A ${R} ${R} 0 0 0 0 ${R} Z`}
          className="fill-primary"
        />
        <circle
          r={R}
          fill="none"
          strokeWidth={1.5}
          className="stroke-primary"
        />
      </>
    );
  }
  return (
    <circle
      r={R}
      fill="var(--background)"
      strokeWidth={1.5}
      className="stroke-muted-foreground"
    />
  );
}

export function PhaseMap({
  phases,
  statuses,
  interactive = false,
  animate = false,
}: {
  phases: readonly PhaseMapPhase[];
  statuses?: ReadonlyMap<number, PhaseMapStatus>;
  interactive?: boolean;
  animate?: boolean;
}) {
  const layout = layoutPhaseGraph(graph.edges);
  const byNumber = new Map(phases.map((p) => [p.number, p]));
  const pos = new Map(
    layout.nodes.map((n) => [
      n.number,
      {
        x: MARGIN_X + n.depth * X_STEP,
        y: MARGIN_Y + n.layerIndex * Y_STEP,
      },
    ]),
  );
  const maxRows = Math.max(...layout.layerWidths);
  const width = MARGIN_X * 2 + layout.maxDepth * X_STEP;
  const height = MARGIN_Y * 2 + (maxRows - 1) * Y_STEP + 28;

  const nodeLabel = (number: number) => {
    const phase = byNumber.get(number);
    const info = statuses?.get(number);
    const base = phase ? `Fase ${number}: ${phase.title}` : `Fase ${number}`;
    return info
      ? `${base} — ${info.completed} dari ${info.total} selesai`
      : base;
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="hidden h-auto w-full md:block"
        role="img"
        aria-label="Peta kurikulum: 20 fase, dari Fase 0 sampai Fase 19"
      >
        {layout.edges.map(({ from, to }) => {
          const a = pos.get(from);
          const b = pos.get(to);
          if (!a || !b) return null;
          const done = statuses?.get(to)?.status === "COMPLETED";
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={1.5}
              className={done ? "stroke-primary" : "stroke-border"}
            />
          );
        })}
        {layout.nodes.map((node) => {
          const p = pos.get(node.number);
          if (!p) return null;
          const phase = byNumber.get(node.number);
          const status = statuses?.get(node.number)?.status ?? null;
          const inner = (
            <g
              key={node.number}
              transform={`translate(${p.x},${p.y})`}
              className={animate ? "phase-map-node" : undefined}
              style={
                animate
                  ? { animationDelay: `${node.depth * 80}ms` }
                  : undefined
              }
            >
              <title>{nodeLabel(node.number)}</title>
              <NodeMark status={status} />
              <text
                y={27}
                textAnchor="middle"
                fontSize={11}
                className="fill-current font-mono text-muted-foreground"
              >
                {String(node.number).padStart(2, "0")}
              </text>
            </g>
          );
          if (interactive && phase) {
            return (
              <a
                key={node.number}
                href={`/curriculum/${phase.slug}`}
                aria-label={nodeLabel(node.number)}
              >
                {inner}
              </a>
            );
          }
          return inner;
        })}
      </svg>
      <ul className="space-y-1 md:hidden">
        {[...phases]
          .sort((a, b) => a.number - b.number)
          .map((phase) => (
            <li
              key={phase.number}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="font-mono text-sm text-muted-foreground">
                {String(phase.number).padStart(2, "0")}
              </span>
              {interactive ? (
                <Link
                  href={`/curriculum/${phase.slug}`}
                  className="font-sans text-sm font-medium"
                >
                  {phase.title}
                </Link>
              ) : (
                <span className="font-sans text-sm font-medium">
                  {phase.title}
                </span>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}
