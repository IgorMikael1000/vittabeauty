import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; email?: string }>;
}) {
  const { registered, email } = await searchParams;

  return (
    <AuthForm
      initialEmail={email}
      registered={registered === "1"}
    />
  );
}
