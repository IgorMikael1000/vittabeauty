import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegistrationWizard } from "@/components/auth/registration-wizard";

export const metadata: Metadata = {
  title: "Completar cadastro",
};

export default async function GoogleRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email || email.length > 254) {
    redirect("/login");
  }

  return (
    <RegistrationWizard
      googleRegistration
      initialEmail={email.trim().toLowerCase()}
    />
  );
}
