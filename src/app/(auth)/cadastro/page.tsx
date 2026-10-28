import type { Metadata } from "next";
import { RegistrationWizard } from "@/components/auth/registration-wizard";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; email?: string }>;
}) {
  const params = await searchParams;
  const googleRegistration = params.method === "google" && !!params.email;

  return (
    <RegistrationWizard
      googleRegistration={googleRegistration}
      initialEmail={googleRegistration ? params.email : ""}
    />
  );
}
