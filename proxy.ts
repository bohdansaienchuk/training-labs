import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginURL = new URL("/login", request.url);
  loginURL.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginURL);
}

export const config = {
  matcher: [
    "/",
    "/workouts/:path*",
    "/exercises/:path*",
    "/progress/:path*",
    "/logout",
  ],
};
