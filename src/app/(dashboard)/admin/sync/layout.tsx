import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SyncLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userRole = (session.user as { role: string }).role;
  if (userRole !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
