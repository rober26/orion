import { redirect } from "next/navigation";
import AppShell from "../../components/dashboard/AppShell";
import { getAuthenticatedUser } from "../../lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
