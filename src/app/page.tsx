import { redirect } from "next/navigation";
import { getCurrentProfessionalId } from "@/lib/authenticated-professional";

export default async function HomePage() {
  redirect((await getCurrentProfessionalId()) ? "/dashboard" : "/login");
}
