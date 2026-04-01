import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
