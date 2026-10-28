import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string;
    email?: string;
    accountDeletionPending?: string;
  }>;
}) {
  const { registered, email, accountDeletionPending } = await searchParams;

  return (
    <AuthForm
      accountDeletionPending={accountDeletionPending === "1"}
      initialEmail={email}
      registered={registered === "1"}
    />
  );
}
