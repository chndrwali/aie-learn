"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

/**
 * Blok kode dengan header (label bahasa + tombol salin). Isi kode dibaca
 * dari DOM (textContent) saat tombol ditekan — hasil highlight Shiki
 * hanya menambah <span>, teks aslinya tetap utuh.
 */
export function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.querySelector("code")?.textContent ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard tak tersedia (mis. konteks non-HTTPS): diam saja.
    }
  };

  return (
    <div ref={ref} className="my-6 overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b bg-muted px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">
          {language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={copy}
          aria-label="Salin kode"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Disalin" : "Salin"}
        </Button>
      </div>
      <pre className="overflow-x-auto bg-muted/40 p-4 font-mono text-sm leading-[1.6]">
        {children}
      </pre>
    </div>
  );
}
