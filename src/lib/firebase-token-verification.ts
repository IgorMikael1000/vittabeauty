import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";

export const FIREBASE_SESSION_COOKIE = "vitta_session";
export const FIREBASE_SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

const invalidFirebaseTokenCodes = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-credential",
  "auth/invalid-id-token",
  "auth/invalid-session-cookie",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
]);

export function isInvalidFirebaseTokenError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    invalidFirebaseTokenCodes.has(error.code)
  );
}

export async function verifyFirebaseSessionCookie(
  sessionCookie: string,
): Promise<DecodedIdToken | null> {
  if (!sessionCookie || sessionCookie.length > 10_000) return null;

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    if (isInvalidFirebaseTokenError(error)) return null;
    throw error;
  }
}

export async function verifyFirebaseIdTokenClaims(
  idToken: string,
): Promise<DecodedIdToken | null> {
  if (!idToken || idToken.length > 10_000) return null;

  try {
    return await getFirebaseAdminAuth().verifyIdToken(idToken, true);
  } catch (error) {
    if (isInvalidFirebaseTokenError(error)) return null;
    throw error;
  }
}
