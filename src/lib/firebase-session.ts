import "server-only";

import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token";
import {
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE_SECONDS,
  verifyFirebaseSessionCookie,
} from "@/lib/firebase-token-verification";

export {
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE_SECONDS,
  verifyFirebaseSessionCookie,
};

const sessionIssuer = "vitta-beauty";
const sessionAudience = "vitta-dashboard";

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export async function getFirebaseSession() {
  const sessionCookie = (await cookies()).get(FIREBASE_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;
  return verifyFirebaseSessionCookie(sessionCookie);
}

export async function createFirebaseSession(idToken: string): Promise<void> {
  const identity = await verifyFirebaseIdToken(idToken);
  if (!identity) {
    throw new Error("The Firebase ID token is invalid or expired.");
  }
  if (!identity.emailVerified) {
    throw new Error("Firebase email must be verified before creating a session.");
  }

  const sessionCookie = await new SignJWT({
    uid: identity.uid,
    email: identity.email,
    email_verified: identity.emailVerified,
    firebase: { sign_in_provider: identity.providers[0] },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(sessionIssuer)
    .setAudience(sessionAudience)
    .setSubject(identity.uid)
    .setIssuedAt()
    .setExpirationTime(`${FIREBASE_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
  const secure = process.env.NODE_ENV === "production";

  (await cookies()).set(FIREBASE_SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: FIREBASE_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearFirebaseSession(): Promise<void> {
  (await cookies()).delete(FIREBASE_SESSION_COOKIE);
}
