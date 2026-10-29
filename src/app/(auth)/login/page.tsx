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
    accountDeleted?: string;
    deletionPending?: string;
    emailChanged?: string;
    signOutFailed?: string;
  }>;
}) {
  const {
    registered,
    email,
    accountDeleted,
    deletionPending,
    emailChanged,
    signOutFailed,
  } = await searchParams;

  return (
    <AuthForm
      accountDeleted={accountDeleted === "1"}
      accountDeletionPending={deletionPending === "1"}
      emailChanged={emailChanged === "1"}
      firebaseSignOutFailed={signOutFailed === "1"}
      initialEmail={email}
      registered={registered === "1"}
    />
  );
}
