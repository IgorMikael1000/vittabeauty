import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function RegisterPage() {
  redirect("/cadastro");
}
