import "server-only";

import { createRemoteJWKSet, errors, jwtVerify } from "jose";

export type FirebaseIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  providers: string[];
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

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseIdentity | null> {
  if (!idToken || idToken.length > 10_000) return null;

  const projectId = getFirebaseProjectId();
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, firebaseJwks, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      requiredClaims: ["sub", "iat", "exp", "auth_time"],
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }

  const firebase = payload.firebase;
  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    typeof payload.email !== "string" ||
    typeof payload.email_verified !== "boolean" ||
    typeof payload.auth_time !== "number" ||
    payload.token_use !== "id" ||
    typeof firebase !== "object" ||
    firebase === null ||
    !("sign_in_provider" in firebase) ||
    typeof firebase.sign_in_provider !== "string"
  ) {
    return null;
  }

  return {
    uid: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: payload.email_verified,
    providers: [firebase.sign_in_provider],
  };
}
