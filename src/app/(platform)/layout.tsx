import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getAuthContext } from "@/lib/auth";
import { getCalendarNavAvailability } from "@/lib/domain-focus";
import { resolveWorkspaceDomainState } from "@/lib/workspace-domain-config";
import { redirect } from "next/navigation";


export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }
  const [canAccessCalendar, domainState] = await Promise.all([
    getCalendarNavAvailability(context.workspaceId),
    resolveWorkspaceDomainState(context.workspaceId),
  ]);

  return (
    <DashboardLayout
      canAccessSettings={context.role === "owner"}
      canAccessCalendar={canAccessCalendar}
      canAccessEvents={domainState.enabledSurfaceDomains.includes("events")}
      canAccessInventory={domainState.enabledSurfaceDomains.includes("inventory")}
      canAccessAssets={domainState.enabledSurfaceDomains.includes("assets")}
    >
      {children}
    </DashboardLayout>
  );
}
