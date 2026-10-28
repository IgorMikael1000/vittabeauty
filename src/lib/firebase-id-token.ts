import "server-only";

export type FirebaseIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  providers: string[];
};

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: unknown;
    email?: unknown;
    emailVerified?: unknown;
    providerUserInfo?: Array<{ providerId?: unknown }>;
  }>;
};

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseIdentity | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured.");
  }
  if (!idToken || idToken.length > 10_000) {
    return null;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) return null;
    throw new Error(`Firebase token verification failed (${response.status}).`);
  }

  const result = (await response.json()) as FirebaseLookupResponse;
  const user = result.users?.[0];
  if (
    typeof user?.localId !== "string" ||
    typeof user.email !== "string" ||
    typeof user.emailVerified !== "boolean"
  ) {
    return null;
  }

  return {
    uid: user.localId,
    email: user.email.trim().toLowerCase(),
    emailVerified: user.emailVerified,
    providers: (user.providerUserInfo ?? [])
      .map((provider) => provider.providerId)
      .filter((provider): provider is string => typeof provider === "string"),
  };
}
