import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Jalur cepat (UX) — BUKAN pengaman utama. Guard sesungguhnya ada di
// app/(learn)/layout.tsx (validasi session di server) + protectedProcedure.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // /admin: perilaku bawaan starter (tanpa callbackURL).
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const callbackURL = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(
      new URL(`/login?callbackURL=${callbackURL}`, request.url),
    );
  }

  // Teruskan path saat ini ke Server Component lewat header, supaya guard
  // lapis 2 di (learn)/layout.tsx bisa redirect dengan callbackURL yang sama.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", `${pathname}${search}`);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard",
    "/curriculum/:path*",
    "/learn/:path*",
    "/notes/:path*",
    "/settings/:path*",
  ],
};
