import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    redirect("/");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
