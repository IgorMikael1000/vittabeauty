import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function getFirebaseAdminAuth() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_CREDENTIALS_NOT_CONFIGURED");
  }

  const app =
    getApps().find((candidate) => candidate.name === "firebase-admin") ??
    initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }) },
      "firebase-admin",
    );
  return getAuth(app);
}
