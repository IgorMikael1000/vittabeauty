import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";

type FirebaseServiceAccount = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

function getServiceAccount() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  let serviceAccount: FirebaseServiceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount) as FirebaseServiceAccount;
  } catch (error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.", {
      cause: error,
    });
  }

  if (
    typeof serviceAccount.project_id !== "string" ||
    !serviceAccount.project_id.trim() ||
    typeof serviceAccount.client_email !== "string" ||
    !serviceAccount.client_email.trim() ||
    typeof serviceAccount.private_key !== "string" ||
    !serviceAccount.private_key.trim()
  ) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain project_id, client_email, and private_key.",
    );
  }

  if (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    serviceAccount.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    throw new Error(
      "The Firebase Admin service account project does not match the Firebase client project.",
    );
  }

  return {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  };
}

let firebaseAdminAuth: Auth | undefined;

export function getFirebaseAdminAuth(): Auth {
  if (firebaseAdminAuth) return firebaseAdminAuth;

  const appName = "vitta-beauty-admin";
  const adminApp =
    getApps().some((app) => app.name === appName)
      ? getApp(appName)
      : initializeApp(
          { credential: cert(getServiceAccount()) },
          appName,
        );

  firebaseAdminAuth = getAuth(adminApp);
  return firebaseAdminAuth;
}
