/**
 * Sanitasi callbackURL pasca-login (front-end-flow.md, "Guard dan callbackURL").
 *
 * Pure function — wajib unit test (lib/safe-redirect.test.ts).
 *
 * Hanya path relatif internal yang lolos. Semua yang lain jatuh ke fallback
 * `/dashboard`: URL absolut, protocol-relative (`//`), backslash di awal path,
 * skema apa pun (`javascript:`, `data:`, ...), dan path login/register
 * (menghindari loop).
 */
export function getSafeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // Tolak skema apa pun (https:, javascript:, data:, ...).
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return fallback;
  // Harus path relatif internal.
  if (!decoded.startsWith("/")) return fallback;
  // Tolak protocol-relative dan backslash di awal.
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) return fallback;

  const pathPart = decoded.split(/[?#]/, 1)[0];
  // Backslash tidak pernah valid di path internal.
  if (pathPart.includes("\\")) return fallback;
  // Hindari loop login/register.
  if (pathPart === "/login" || pathPart === "/register") return fallback;

  return decoded;
}
