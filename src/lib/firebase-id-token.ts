import "server-only";
import { verifyFirebaseIdTokenClaims } from "@/lib/firebase-token-verification";

export type FirebaseIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  providers: string[];
};

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseIdentity | null> {
  if (!idToken || idToken.length > 10_000) {
    return null;
  }

  const decodedToken = await verifyFirebaseIdTokenClaims(idToken);
  if (!decodedToken) return null;
  if (
    typeof decodedToken.uid !== "string" ||
    typeof decodedToken.email !== "string" ||
    typeof decodedToken.email_verified !== "boolean"
  ) {
    return null;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email.trim().toLowerCase(),
    emailVerified: decodedToken.email_verified,
    providers: [decodedToken.firebase.sign_in_provider],
  };
}
