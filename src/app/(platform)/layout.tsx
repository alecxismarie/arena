import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getAuthContext } from "@/lib/auth";
import { getDomainUsageSignals } from "@/lib/domain-focus";
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
  const domainSignals = await getDomainUsageSignals(context.workspaceId);

  return (
    <DashboardLayout
      canAccessSettings={context.role === "owner"}
      canAccessCalendar={
        domainSignals.counts.events > 0 || domainSignals.counts.assets > 0
      }
    >
      {children}
    </DashboardLayout>
  );
}
