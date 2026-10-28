import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import {
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE_SECONDS,
  verifyFirebaseSessionCookie,
  verifyFirebaseIdTokenClaims,
} from "@/lib/firebase-token-verification";

export {
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE_SECONDS,
  verifyFirebaseSessionCookie,
};

export async function getFirebaseSession(): Promise<DecodedIdToken | null> {
  const sessionCookie = (await cookies()).get(FIREBASE_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;
  return verifyFirebaseSessionCookie(sessionCookie);
}

export async function createFirebaseSession(idToken: string): Promise<void> {
  const firebaseAdminAuth = getFirebaseAdminAuth();
  const decodedToken = await verifyFirebaseIdTokenClaims(idToken);
  if (!decodedToken) {
    throw new Error("The Firebase ID token is invalid or expired.");
  }
  if (!decodedToken.email_verified) {
    throw new Error("Firebase email must be verified before creating a session.");
  }

  const sessionCookie = await firebaseAdminAuth.createSessionCookie(idToken, {
    expiresIn: FIREBASE_SESSION_MAX_AGE_SECONDS * 1000,
  });
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
