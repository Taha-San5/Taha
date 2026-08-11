import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

/**
 * Gate the authenticated app shell at the edge. Route handlers and server
 * components still re-check the session against the database — this only
 * avoids rendering the shell for anonymous visitors.
 */
export async function middleware(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/app") {
      url.searchParams.set("next", request.nextUrl.pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
