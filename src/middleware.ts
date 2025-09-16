import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextMiddlewareWithAuth } from "next-auth/middleware";

// Public routes that don't require authentication
const publicRoutes = [
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/error",
  "/game/invite", // Allow invite redemption without auth
];

// Routes that should be accessible regardless of auth status
const alwaysAccessibleRoutes = [
  "/api",
];

// Function to check if a path matches a route pattern
function isPublicRoute(pathname: string): boolean {
  // Check exact matches and prefix matches for public routes
  return publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
}

function isAlwaysAccessible(pathname: string): boolean {
  return alwaysAccessibleRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
}

// Check if path is a specific game by ID (allow without auth for spectating)
function isGameById(pathname: string): boolean {
  // Match /game/[id] but not /game/bot, /game/local, etc.
  const gameByIdPattern = /^\/game\/[a-zA-Z0-9-]+$/;
  return gameByIdPattern.test(pathname);
}

const authMiddleware: NextMiddlewareWithAuth = withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    
    // If user is authenticated but needs to set username
    if (
      req.nextauth.token &&
      req.nextauth.token.needsUsername &&
      !pathname.startsWith("/auth/new-user")
    ) {
      const newUserUrl = new URL("/auth/new-user", req.url);
      // Preserve callbackUrl if it exists
      if (callbackUrl) {
        newUserUrl.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(newUserUrl);
    }

    // If user is authenticated, prevent access to sign-in and sign-up
    if (
      req.nextauth.token &&
      (pathname.startsWith("/auth/signin") ||
        pathname.startsWith("/auth/signup"))
    ) {
      // Redirect to callbackUrl if provided, otherwise home
      const redirectUrl = callbackUrl || "/";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Always allow API routes
        if (isAlwaysAccessible(pathname)) {
          return true;
        }
        
        // Allow public routes
        if (isPublicRoute(pathname)) {
          return true;
        }
        
        // Allow specific game pages (for spectating/joining)
        if (isGameById(pathname)) {
          return true;
        }
        
        // Allow auth pages for unauthenticated users
        if (pathname.startsWith("/auth/")) {
          return true;
        }
        
        // All other routes require authentication
        // If not authenticated, this will trigger a redirect to signin
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  },
);

// Custom middleware wrapper to handle redirect logic
export default function middleware(req: NextRequest) {
  // For unauthenticated requests to protected routes, handle redirect manually
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search; // Get query params
  
  // Check if this route needs authentication
  const needsAuth = !isAlwaysAccessible(pathname) && 
                    !isPublicRoute(pathname) && 
                    !isGameById(pathname) && 
                    !pathname.startsWith("/auth/");
  
  // If route needs auth, we'll let withAuth handle it
  // But we need to intercept its redirect to customize the callbackUrl
  if (needsAuth) {
    // Check if user is authenticated (this is a simplified check)
    const token = req.cookies.get("next-auth.session-token") || 
                  req.cookies.get("__Secure-next-auth.session-token");
    
    if (!token) {
      // User is not authenticated, redirect to signin
      const signinUrl = new URL("/auth/signin", req.url);
      
      // Only add callbackUrl if it's not the home page
      if (pathname !== "/") {
        // Include the full path with query params if present
        const fullPath = pathname + search;
        signinUrl.searchParams.set("callbackUrl", fullPath);
      }
      
      return NextResponse.redirect(signinUrl);
    }
  }
  
  // For all other cases, use the standard auth middleware
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes are checked but allowed through
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
