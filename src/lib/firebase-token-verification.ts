import "server-only";

import { errors, jwtVerify } from "jose";

export const FIREBASE_SESSION_COOKIE = "vitta_session";
export const FIREBASE_SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

const sessionIssuer = "vitta-beauty";
const sessionAudience = "vitta-dashboard";

export type FirebaseSessionClaims = {
  uid: string;
  email: string;
  email_verified: boolean;
  firebase: { sign_in_provider: string };
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyFirebaseSessionCookie(
  sessionCookie: string,
): Promise<FirebaseSessionClaims | null> {
  if (!sessionCookie || sessionCookie.length > 10_000) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(sessionCookie, getSessionSecret(), {
      algorithms: ["HS256"],
      audience: sessionAudience,
      issuer: sessionIssuer,
      requiredClaims: ["sub", "iat", "exp"],
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }

  const firebase = payload.firebase;
  if (
    typeof payload.uid !== "string" ||
    !payload.uid ||
    payload.sub !== payload.uid ||
    typeof payload.email !== "string" ||
    typeof payload.email_verified !== "boolean" ||
    typeof firebase !== "object" ||
    firebase === null ||
    !("sign_in_provider" in firebase) ||
    typeof firebase.sign_in_provider !== "string"
  ) {
    return null;
  }

  return {
    uid: payload.uid,
    email: payload.email,
    email_verified: payload.email_verified,
    firebase: { sign_in_provider: firebase.sign_in_provider },
  };
}
