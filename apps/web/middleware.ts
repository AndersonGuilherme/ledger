import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "access_token";

const PUBLIC_ROUTES = ["/login"];
const PROTECTED_PREFIXES = ["/wallets", "/"];

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return false;
  // root redirect is handled by page.tsx
  if (pathname === "/") return false;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const authCookie =
    request.cookies.get(AUTH_COOKIE_NAME) ||
    request.cookies.get("jwt") ||
    request.cookies.get("token");

  const isAuthenticated = !!authCookie;

  // Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/wallets", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
