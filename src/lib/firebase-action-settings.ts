import type { ActionCodeSettings } from "firebase/auth";

export function getFirebaseActionCodeSettings(
  continuePath = "/login",
): ActionCodeSettings {
  return {
    url: new URL(continuePath, window.location.origin).toString(),
    handleCodeInApp: false,
  };
}
