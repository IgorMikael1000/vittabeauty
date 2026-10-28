import type { ActionCodeSettings } from "firebase/auth";

export function getFirebaseActionCodeSettings(): ActionCodeSettings {
  return {
    url: new URL("/login", window.location.origin).toString(),
    handleCodeInApp: false,
  };
}
