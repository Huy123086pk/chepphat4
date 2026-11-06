import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level guard: protected pages require a session cookie.
 * Real validation (DB check) happens in every API route via getValidSession().
 */
export const config = {
  matcher: ["/", "/write/:path*", "/settings", "/lock"],
};

export default function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("wr_session")?.value);
  const path = req.nextUrl.pathname;

  if (path === "/lock") {
    if (hasSession) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL("/lock", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
