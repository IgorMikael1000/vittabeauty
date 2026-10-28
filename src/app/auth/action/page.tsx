import { redirect } from "next/navigation";

export default async function AuthActionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const mode = params.mode;
  const actionCode = params.oobCode;
  const firstMode = Array.isArray(mode) ? mode[0] : mode;
  const firstActionCode = Array.isArray(actionCode)
    ? actionCode[0]
    : actionCode;

  if (
    !firebaseAuthDomain ||
    !firstMode ||
    !firstActionCode ||
    firstActionCode.length > 10_000
  ) {
    redirect("/login?authAction=invalid");
  }

  const destination = new URL(
    "/__/auth/action",
    `https://${firebaseAuthDomain}`,
  );
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      destination.searchParams.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) destination.searchParams.append(key, entry);
    }
  }
  redirect(destination.toString());
}
