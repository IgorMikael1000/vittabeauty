import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/auth/password-reset-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default function ForgotPasswordPage() {
  return <PasswordResetForm />;
}
