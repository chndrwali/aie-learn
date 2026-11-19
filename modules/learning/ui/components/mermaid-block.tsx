"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Diagram Mermaid (client, lazy import). Mermaid di-render ke SVG;
 * tema mengikuti mode terang/gelap. Jika render gagal (sintaks tidak
 * valid), sumber diagram ditampilkan sebagai blok kode biasa.
 */
export function MermaidBlock({ code }: { code: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const renderCount = useRef(0);
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    renderCount.current += 1;
    const renderId = `mermaid-${rawId}-${renderCount.current}`;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === "dark" ? "dark" : "default",
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render(renderId, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, rawId, resolvedTheme]);

  if (failed) {
    return (
      <pre className="my-6 overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm leading-[1.6]">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Diagram"
      className="my-6 min-h-24 overflow-x-auto rounded-lg border bg-card p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
    />
  );
}
