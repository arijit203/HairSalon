import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_1234567890_change_in_prod"
);

// Admin-only pages
const ADMIN_PATHS = [
  "/pos",
  "/analytics",
  "/settings",
  "/products",
  "/services",
  "/appointments",
  "/clients"
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip static assets, favicon, or files
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.includes(".") ||
    path.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("wyapar-auth-token")?.value;

  // Verify token
  let payload: any = null;
  if (token) {
    try {
      const { payload: verified } = await jwtVerify(token, JWT_SECRET);
      payload = verified;
    } catch (e) {
      // Invalid token, treat as unauthenticated
    }
  }

  const isLoginPage = path === "/login";
  const isRegisterPage = path === "/register";

  if (!payload) {
    // If not logged in and not on login/register page, redirect to /login
    if (!isLoginPage && !isRegisterPage) {
      const loginUrl = new URL("/login", request.url);
      // Retain the intended path as parameter
      if (path !== "/") {
        loginUrl.searchParams.set("callbackUrl", path);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Authenticated
  if (isLoginPage || isRegisterPage) {
    // Redirect logged-in users away from auth pages to their respective homes
    const destination = payload.roleType === "staff" ? "/" : "/portal";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Customer (Client) restrictions
  if (payload.roleType === "client") {
    // Customers can ONLY access /portal/*
    if (path === "/" || ADMIN_PATHS.some(p => path === p || path.startsWith(p + "/"))) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  } 
  // Staff restrictions
  else if (payload.roleType === "staff") {
    // Staff cannot access /portal/*
    if (path.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Role-based staff access restrictions: Only ADMIN can access Analytics and Settings
    if (payload.staffRole !== "ADMIN") {
      if (path.startsWith("/analytics") || path.startsWith("/settings")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (handled inside the middleware separately or skipped)
     * - _next/static, _next/image
     * - favicon.ico, images, icons
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
