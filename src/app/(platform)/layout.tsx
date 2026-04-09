import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getAuthContext } from "@/lib/auth";
import { getCalendarNavAvailability } from "@/lib/domain-focus";
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
  const canAccessCalendar = await getCalendarNavAvailability(context.workspaceId);

  return (
    <DashboardLayout
      canAccessSettings={context.role === "owner"}
      canAccessCalendar={canAccessCalendar}
    >
      {children}
    </DashboardLayout>
  );
}
