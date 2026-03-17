import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
