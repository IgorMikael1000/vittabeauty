import { redirect } from "next/navigation";

type ActionSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthActionPage({
  searchParams,
}: {
  searchParams: Promise<ActionSearchParams>;
}) {
  const params = await searchParams;
  const mode = firstValue(params.mode);
  const actionCode = firstValue(params.oobCode);

  if (!actionCode || actionCode.length > 10_000) {
    redirect("/auth/verificado?result=invalid-link");
  }

  const query = new URLSearchParams({ oobCode: actionCode });

  switch (mode) {
    case "resetPassword":
      redirect(`/auth/nova-senha?${query.toString()}`);
    case "verifyEmail":
    case "recoverEmail":
    case "verifyAndChangeEmail":
      query.set("mode", mode);
      redirect(`/auth/verificado?${query.toString()}`);
    default:
      redirect("/auth/verificado?result=unsupported-action");
  }
}
