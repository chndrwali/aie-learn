import prisma from "@/lib/prisma";

/**
 * landing.outline — satu-satunya procedure publik (baseProcedure).
 * Output allowlist (backend_flow.md, PRD §9): hanya nomor, slug, judul,
 * tagline, dan jumlah materi per fase + totals. TIDAK PERNAH ada contentMd
 * atau judul materi di sini.
 */
export async function getOutline() {
  const phases = await prisma.phase.findMany({
    where: { isActive: true },
    orderBy: { number: "asc" },
    select: {
      number: true,
      slug: true,
      title: true,
      tagline: true,
      _count: {
        select: { lessons: { where: { isActive: true } } },
      },
    },
  });

  const outline = phases.map((p) => ({
    number: p.number,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    lessonCount: p._count.lessons,
  }));

  return {
    totals: {
      phases: outline.length,
      lessons: outline.reduce((sum, p) => sum + p.lessonCount, 0),
    },
    phases: outline,
  };
}
