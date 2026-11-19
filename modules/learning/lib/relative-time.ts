/**
 * Format "terakhir dibuka" untuk kartu Lanjutkan & aktivitas terakhir
 * (DESIGN.md: "Dibuka kemarin 14.20"). Pure function — tanpa I/O.
 * Jam memakai titik (gaya Indonesia: 14.20, bukan 14:20).
 */

const TIME = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatLastViewed(viewedAt: Date, now: Date): string {
  const time = TIME.format(viewedAt).replace(":", ".");
  const dayDiff = Math.round(
    (startOfDay(now).getTime() - startOfDay(viewedAt).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (dayDiff <= 0) return `Hari ini ${time}`;
  if (dayDiff === 1) return `Kemarin ${time}`;
  return `${DATE.format(viewedAt)} ${time}`;
}
