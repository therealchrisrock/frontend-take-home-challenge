import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If user is authenticated but still needs to set a username, force them to the username page
    // Check if user needs to set username
    if (
      req.nextauth.token &&
      !req.nextauth.token.username &&
      !req.nextUrl.pathname.startsWith("/auth/new-user")
    ) {
      return NextResponse.redirect(new URL("/auth/new-user", req.url));
    }

    // If user is authenticated, prevent access to sign-in and sign-up
    if (
      req.nextauth.token &&
      (req.nextUrl.pathname.startsWith("/auth/signin") || req.nextUrl.pathname.startsWith("/auth/signup"))
    ) {
      return NextResponse.redirect(new URL("/profile", req.url));
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
    "/auth/:path*",
    "/messages/:path*",
    "/friends/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};