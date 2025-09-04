import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Check if user needs to set username
    if (
      req.nextauth.token &&
      !req.nextauth.token.username &&
      !req.nextUrl.pathname.startsWith("/auth/new-user")
    ) {
      return NextResponse.redirect(new URL("/auth/new-user", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages for everyone
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true;
        }
        // Allow access to public pages
        if (req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/api")) {
          return true;
        }
        // Require authentication for other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/messages/:path*",
    "/friends/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};