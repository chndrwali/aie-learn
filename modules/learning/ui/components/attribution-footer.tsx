/**
 * Footer atribusi materi (RSC, AGENTS.md): konten berasal dari repo MIT
 * upstream — copyright dan lisensi wajib tetap tampil, plus tautan ke
 * berkas sumber asli pada commit yang di-pin saat ingest (T2).
 */
const UPSTREAM_SHA = "8afa245ebc2e8861480edf8c4911a2b6d9769688";
const UPSTREAM_REPO = "https://github.com/rohitg00/ai-engineering-from-scratch";

export function AttributionFooter({ sourcePath }: { sourcePath: string }) {
  const sourceUrl = `${UPSTREAM_REPO}/blob/${UPSTREAM_SHA}/${sourcePath}.md`;
  return (
    <footer className="mt-12 border-t pt-6 font-sans text-sm text-muted-foreground">
      <p>
        Materi ini berasal dari kurikulum{" "}
        <a
          href={UPSTREAM_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
        >
          rohitg00/ai-engineering-from-scratch
        </a>{" "}
        (lisensi MIT), diterjemahkan ke Bahasa Indonesia.{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
        >
          Lihat sumber asli
        </a>
        .
      </p>
    </footer>
  );
}
