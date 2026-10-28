import "server-only";

import { createRemoteJWKSet, errors, jwtVerify } from "jose";

export type FirebaseIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  providers: string[];
  photoUrl: string | null;
  authTime: number;
};

export type FirebaseTokenValidation = {
  identity: FirebaseIdentity | null;
  diagnostic?: string;
};

const firebaseJwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

function getFirebaseProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }
  return projectId;
}

export async function verifyFirebaseIdTokenWithDiagnostics(
  idToken: string,
): Promise<FirebaseTokenValidation> {
  if (!idToken || idToken.length > 10_000) {
    return { identity: null, diagnostic: "ID_TOKEN_MISSING_OR_TOO_LARGE" };
  }

  let projectId: string;
  try {
    projectId = getFirebaseProjectId();
  } catch {
    return { identity: null, diagnostic: "FIREBASE_PROJECT_ID_NOT_CONFIGURED" };
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, firebaseJwks, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      requiredClaims: ["sub", "iat", "exp", "auth_time"],
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      const claim =
        "claim" in error && typeof error.claim === "string"
          ? `:${error.claim}`
          : "";
      return {
        identity: null,
        diagnostic: `FIREBASE_JWT_REJECTED:${error.code}${claim}`,
      };
    }
    throw error;
  }

  const firebase = payload.firebase;
  const authTime = payload.auth_time;
  if (typeof payload.sub !== "string" || !payload.sub)
    return { identity: null, diagnostic: "FIREBASE_JWT_SUBJECT_MISSING" };
  if (typeof payload.email !== "string" || !payload.email)
    return { identity: null, diagnostic: "FIREBASE_JWT_EMAIL_MISSING" };
  if (typeof payload.email_verified !== "boolean")
    return { identity: null, diagnostic: "FIREBASE_JWT_EMAIL_VERIFIED_MISSING" };
  if (typeof payload.auth_time !== "number")
    return { identity: null, diagnostic: "FIREBASE_JWT_AUTH_TIME_MISSING" };
  if (typeof firebase !== "object" || firebase === null)
    return { identity: null, diagnostic: "FIREBASE_CLAIMS_MISSING" };
  if (
    !("sign_in_provider" in firebase) ||
    typeof firebase.sign_in_provider !== "string"
  ) {
    return {
      identity: null,
      diagnostic: "FIREBASE_SIGN_IN_PROVIDER_MISSING",
    };
  }
  const identities =
    "identities" in firebase &&
    typeof firebase.identities === "object" &&
    firebase.identities !== null
      ? Object.keys(firebase.identities)
      : [];
  let photoUrl: string | null = null;
  if (typeof payload.picture === "string" && payload.picture.length <= 2048) {
    try {
      const pictureUrl = new URL(payload.picture);
      if (pictureUrl.protocol === "https:" && !pictureUrl.username && !pictureUrl.password) {
        photoUrl = pictureUrl.toString();
      }
    } catch {
      photoUrl = null;
    }
  }

  return {
    identity: {
      uid: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: payload.email_verified,
      authTime,
      providers: Array.from(
        new Set([firebase.sign_in_provider, ...identities]),
      ),
      photoUrl,
    },
  };
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseIdentity | null> {
  const result = await verifyFirebaseIdTokenWithDiagnostics(idToken);
  return result.identity;
}
