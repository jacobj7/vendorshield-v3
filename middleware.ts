import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        if (pathname.startsWith("/api/auth/")) {
          return true;
        }

        const onboardPattern = /^\/api\/vendors\/[^/]+\/onboard(\/.*)?$/;
        if (onboardPattern.test(pathname)) {
          return true;
        }

        if (pathname.startsWith("/api/")) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  },
);

export const config = {
  matcher: ["/api/:path*"],
};
