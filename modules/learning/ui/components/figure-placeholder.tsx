/**
 * Placeholder netral untuk pagar ```figure upstream.
 *
 * Figure upstream adalah diagram yang dirender kode JS mereka sendiri
 * (terdaftar di site/figures-*.js) — bukan file gambar, jadi tidak bisa
 * ditampilkan di sini tanpa mem-porting sistem figure mereka. Blok ini
 * ditampilkan apa adanya sebagai penanda, bukan gambar palsu.
 * Keputusan porting vs ganti diagram statis: lihat Backlog temuan TASKS.md.
 */
export function FigurePlaceholder({ figureId }: { figureId: string }) {
  const id = figureId.trim().split(/\s+/)[0] ?? "";
  return (
    <figure className="my-6 rounded-lg border bg-muted/40 px-4 py-6 text-center">
      <figcaption className="font-sans text-sm font-medium">
        Gambar: {id || "tanpa nama"}
      </figcaption>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Diagram interaktif dari kurikulum asli belum tersedia di sini.
      </p>
    </figure>
  );
}
