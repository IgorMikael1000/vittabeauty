import type { Metadata } from "next";
import { EmailChangeReturn } from "@/components/auth/email-change-return";

export const metadata: Metadata = {
  title: "E-mail atualizado",
};

export default function EmailUpdatedPage() {
  return <EmailChangeReturn />;
}
