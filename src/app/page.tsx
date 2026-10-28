import { redirect } from "next/navigation";
import { getFirebaseSession } from "@/lib/firebase-session";

export default async function HomePage() {
  const session = await getFirebaseSession();
  redirect(session ? "/dashboard" : "/login");
}
