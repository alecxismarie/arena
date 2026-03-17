import {
  AttendanceByEventChart,
  RevenueTrendChart,
  SalesTrendChart,
  TicketDistributionChart,
} from "@/components/charts/dashboard-charts";
import { ChartCard } from "@/components/ui/chart-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData } from "@/lib/analytics";
import { CalendarClock, DollarSign, TicketCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const statIconMap = {
  events: CalendarClock,
  tickets: TicketCheck,
  attendance: Users,
  revenue: DollarSign,
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/85 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
        <p className="text-sm font-medium text-accent">Cockpit Arena Analytics</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Event intelligence dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Monitor event performance, attendance momentum, and revenue movement in
          one premium analytics workspace.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={statIconMap[stat.key as keyof typeof statIconMap]}
            format={stat.key === "revenue" ? "currency" : "number"}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <ChartCard
          title="Revenue Trend"
          subtitle="Weekly and monthly arena revenue flow"
          className="xl:col-span-4"
        >
          <RevenueTrendChart
            weekly={data.weeklyRevenueTrend}
            monthly={data.monthlyRevenueTrend}
          />
        </ChartCard>

        <ChartCard
          title="Ticket Distribution"
          subtitle="Ticket volume by event"
          className="xl:col-span-3"
        >
          <TicketDistributionChart data={data.ticketDistribution} />
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <ChartCard
          title="Attendance by Event"
          subtitle="Top events ranked by check-ins"
          className="xl:col-span-4"
        >
          <AttendanceByEventChart data={data.attendanceByEvent} />
        </ChartCard>

        <ChartCard
          title="Sales Trend"
          subtitle="Last 30 days of ticket purchases"
          className="xl:col-span-3"
        >
          <SalesTrendChart data={data.salesTrend} />
        </ChartCard>
      </section>
    </div>
  );
}
