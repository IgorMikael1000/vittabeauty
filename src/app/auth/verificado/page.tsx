import type { Metadata } from "next";
import { EmailActionResult } from "@/components/auth/email-action-result";

export const metadata: Metadata = {
  title: "Confirmação de e-mail",
};

export default async function VerifiedEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[];
    oobCode?: string | string[];
    result?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const actionCode = Array.isArray(params.oobCode)
    ? params.oobCode[0]
    : params.oobCode;
  const result = Array.isArray(params.result)
    ? params.result[0]
    : params.result;

  return (
    <EmailActionResult
      actionCode={actionCode ?? ""}
      mode={mode ?? ""}
      result={result ?? ""}
    />
  );
}
