import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isOnboarding = path.startsWith("/onboarding");
    const isApi = path.startsWith("/api");

    if (token && !token.onboardingComplete && !isOnboarding && !isApi) {
      if (token.role === "TEACHER") {
        return NextResponse.redirect(new URL("/onboarding/teacher", req.url));
      } else {
        return NextResponse.redirect(new URL("/onboarding/student", req.url));
      }
    }

    if (path.startsWith("/teacher") && token?.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/student/dashboard", req.url));
    }

    if (path.startsWith("/student") && token?.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/teacher/:path*", "/student/:path*"],
};
