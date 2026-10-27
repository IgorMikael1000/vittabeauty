import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!professional) {
    redirect("/login");
  }
  if (professional.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session.user.id;
}
