import type { Metadata } from "next";
import { RegistrationWizard } from "@/components/auth/registration-wizard";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function RegisterPage() {
  return <RegistrationWizard />;
}
