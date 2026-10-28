import type { Metadata } from "next";
import { PasswordResetActionForm } from "@/components/auth/password-reset-action-form";

export const metadata: Metadata = {
  title: "Criar nova senha",
};

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ oobCode?: string | string[] }>;
}) {
  const params = await searchParams;
  const actionCode = Array.isArray(params.oobCode)
    ? params.oobCode[0]
    : params.oobCode;

  return <PasswordResetActionForm actionCode={actionCode ?? ""} />;
}
