import { NextResponse, type NextRequest } from "next/server";
import {
  FIREBASE_SESSION_COOKIE,
  verifyFirebaseSessionCookie,
} from "@/lib/firebase-token-verification";

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(FIREBASE_SESSION_COOKIE)?.value;
  const session = sessionCookie
    ? await verifyFirebaseSessionCookie(sessionCookie)
    : null;

  if (session) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  if (sessionCookie) {
    response.cookies.delete(FIREBASE_SESSION_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
