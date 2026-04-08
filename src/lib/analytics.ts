import { requireAuthContext } from "@/lib/auth";
import {
  mapEventRecord,
  normalizeEventStatus,
  toNumber,
} from "@/lib/analytics/event-mapping";
import { buildPeriodData } from "@/lib/analytics/period-aggregation";
import { EventRecord } from "@/lib/analytics/types";
import {
  calculateAttendanceComparison,
  percentageChange,
  toTrend,
} from "@/lib/analytics/metrics";
import { getWorkspaceDailyAggregates } from "@/lib/workspace-daily-aggregates";
import { eventPerformanceInsightAdapter } from "@/lib/domains/event-performance-adapter";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

type ReportMetric = {
  label: string;
  value: number;
};

export type { EventRecord };

export async function getDashboardData() {
  const context = await requireAuthContext();
  const now = new Date();
  const weekStart = subDays(now, 7);
  const prevWeekStart = subDays(now, 14);
  const aggregateRangeStart = startOfDay(subMonths(now, 6));
  const aggregateRangeEnd = endOfDay(now);

  const [dailyAggregateRows, attendanceRows, distributionRows] = await Promise.all([
    getWorkspaceDailyAggregates({
      workspaceId: context.workspaceId,
      from: aggregateRangeStart,
      to: aggregateRangeEnd,
    }),
    prisma.event.findMany({
      where: {
        workspace_id: context.workspaceId,
      },
      take: 8,
      orderBy: [{ attendance_count: "desc" }, { date: "desc" }],
      select: {
        id: true,
        name: true,
        expected_attendees: true,
        attendance_count: true,
        status: true,
        end_time: true,
      },
    }),
    prisma.event.findMany({
      where: {
        workspace_id: context.workspaceId,
        tickets_sold: {
          gt: 0,
        },
      },
      take: 6,
      orderBy: [{ tickets_sold: "desc" }, { date: "desc" }],
      select: {
        id: true,
        name: true,
        tickets_sold: true,
      },
    }),
  ]);

  // Canonical runtime metrics currently come from Event rollups and
  // WorkspaceDailyAggregate, not raw TicketSale / AttendanceLog rows.
  const eventTotals = dailyAggregateRows.reduce(
    (acc, row) => ({
      events: acc.events + row.event_count,
      expected_attendees: acc.expected_attendees + row.expected_attendees,
      tickets_sold: acc.tickets_sold + row.tickets_sold,
      attendance_count: acc.attendance_count + row.attendance_count,
      revenue: acc.revenue + toNumber(row.revenue),
    }),
    {
      events: 0,
      expected_attendees: 0,
      tickets_sold: 0,
      attendance_count: 0,
      revenue: 0,
    },
  );

  const currentWeekTotals = dailyAggregateRows
    .filter((row) => row.date >= weekStart && row.date <= now)
    .reduce(
      (acc, row) => ({
        events: acc.events + row.event_count,
        tickets_sold: acc.tickets_sold + row.tickets_sold,
        attendance_count: acc.attendance_count + row.attendance_count,
        revenue: acc.revenue + toNumber(row.revenue),
      }),
      {
        events: 0,
        tickets_sold: 0,
        attendance_count: 0,
        revenue: 0,
      },
    );

  const previousWeekTotals = dailyAggregateRows
    .filter((row) => row.date >= prevWeekStart && row.date < weekStart)
    .reduce(
      (acc, row) => ({
        events: acc.events + row.event_count,
        tickets_sold: acc.tickets_sold + row.tickets_sold,
        attendance_count: acc.attendance_count + row.attendance_count,
        revenue: acc.revenue + toNumber(row.revenue),
      }),
      {
        events: 0,
        tickets_sold: 0,
        attendance_count: 0,
        revenue: 0,
      },
    );

  const ticketChange = percentageChange(
    currentWeekTotals.tickets_sold,
    previousWeekTotals.tickets_sold,
  );
  const revenueChange = percentageChange(
    currentWeekTotals.revenue,
    previousWeekTotals.revenue,
  );
  const attendanceChange = percentageChange(
    currentWeekTotals.attendance_count,
    previousWeekTotals.attendance_count,
  );
  const eventChange = percentageChange(
    currentWeekTotals.events,
    previousWeekTotals.events,
  );

  const weeklySlots = eachWeekOfInterval({
    start: startOfWeek(subWeeks(now, 11), { weekStartsOn: 1 }),
    end: now,
  });
  const monthlySlots = eachMonthOfInterval({
    start: subMonths(now, 5),
    end: now,
  });

  const weeklyRevenueMap = new Map<string, number>();
  const monthlyRevenueMap = new Map<string, number>();
  const salesByDayMap = new Map<string, number>();

  dailyAggregateRows.forEach((row) => {
    const weekKey = format(startOfWeek(row.date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthKey = format(row.date, "yyyy-MM");
    weeklyRevenueMap.set(weekKey, (weeklyRevenueMap.get(weekKey) ?? 0) + toNumber(row.revenue));
    monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) ?? 0) + toNumber(row.revenue));

    const dayKey = format(row.date, "yyyy-MM-dd");
    salesByDayMap.set(dayKey, (salesByDayMap.get(dayKey) ?? 0) + row.tickets_sold);
  });

  const weeklyRevenueTrend = weeklySlots.map((date) => {
    const key = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    return {
      label: format(date, "MMM d"),
      revenue: weeklyRevenueMap.get(key) ?? 0,
    };
  });

  const monthlyRevenueTrend = monthlySlots.map((date) => {
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM"),
      revenue: monthlyRevenueMap.get(key) ?? 0,
    };
  });

  const salesTrend = eachDayOfInterval({
    start: subDays(now, 29),
    end: now,
  }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      label: format(day, "MMM d"),
      tickets: salesByDayMap.get(key) ?? 0,
    };
  });

  const overallExpected = eventTotals.expected_attendees;
  const overallActual = eventTotals.attendance_count;

  return {
    stats: [
      {
        key: "events",
        label: "Total Events",
        value: eventTotals.events,
        change: eventChange,
        trend: toTrend(eventChange),
      },
      {
        key: "tickets",
        label: "Tickets Sold",
        value: eventTotals.tickets_sold,
        change: ticketChange,
        trend: toTrend(ticketChange),
      },
      {
        key: "attendance",
        label: "Actual Attendance",
        value: overallActual,
        change: attendanceChange,
        trend: toTrend(attendanceChange),
      },
      {
        key: "revenue",
        label: "Revenue",
        value: eventTotals.revenue,
        change: revenueChange,
        trend: toTrend(revenueChange),
      },
    ],
    attendanceComparison: calculateAttendanceComparison(overallExpected, overallActual),
    weeklyRevenueTrend,
    monthlyRevenueTrend,
    salesTrend,
    attendanceByEvent: attendanceRows.map((row) => {
      const comparison = calculateAttendanceComparison(
        row.expected_attendees,
        row.attendance_count,
      );
      return {
        id: row.id,
        name: row.name,
        attendance: row.attendance_count,
        expected: row.expected_attendees,
        variance: comparison.variance,
        rate: comparison.rate,
        status: normalizeEventStatus(row.end_time, row.status),
      };
    }),
    ticketDistribution: distributionRows.map((row) => ({
      id: row.id,
      name: row.name,
      tickets: row.tickets_sold,
    })),
  };
}

export async function getEvents() {
  const context = await requireAuthContext();
  const events = await prisma.event.findMany({
    where: {
      workspace_id: context.workspaceId,
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { start_time: "asc" }],
  });

  return events.map((event) => mapEventRecord(event));
}

export async function getCalendarEvents() {
  const context = await requireAuthContext();
  const events = await prisma.event.findMany({
    include: {
      venue: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      workspace_id: context.workspaceId,
      date: {
        gte: startOfDay(subMonths(new Date(), 1)),
        lte: endOfDay(addMonths(new Date(), 2)),
      },
    },
    orderBy: [{ date: "asc" }, { start_time: "asc" }],
  });

  return events.map((event) => mapEventRecord(event));
}

export async function getEventById(eventId: string) {
  const context = await requireAuthContext();
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      workspace_id: context.workspaceId,
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!event) return null;

  const mapped = mapEventRecord(event);
  const historicalRows = await prisma.event.findMany({
    where: {
      id: { not: event.id },
      workspace_id: context.workspaceId,
      status: { not: "cancelled" },
      end_time: { lt: new Date() },
    },
    select: {
      id: true,
      name: true,
      date: true,
      end_time: true,
      venue_id: true,
      expected_attendees: true,
      tickets_sold: true,
      attendance_count: true,
    },
    orderBy: {
      end_time: "desc",
    },
    take: 120,
  });

  const intelligence = eventPerformanceInsightAdapter.computeDeterministicInsights({
    currentEvent: mapped,
    historicalRows,
  });

  return {
    event: mapped,
    salesTrend: [
      {
        label: format(mapped.date, "MMM d"),
        tickets: mapped.tickets_sold,
        revenue: mapped.revenue,
      },
    ],
    attendanceComparison: calculateAttendanceComparison(
      mapped.expected_attendees,
      mapped.actual_attendees,
    ),
    intelligence,
  };
}

export async function getReportsData() {
  const context = await requireAuthContext();
  const [events, dailyAggregateRows] = await Promise.all([
    prisma.event.findMany({
      where: {
        workspace_id: context.workspaceId,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { start_time: "desc" }],
    }),
    getWorkspaceDailyAggregates({
      workspaceId: context.workspaceId,
      from: startOfDay(subMonths(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  ]);

  const tableRows = events.map((event) => mapEventRecord(event));
  const periodRows = dailyAggregateRows.map((row) => ({
    date: row.date,
    tickets_sold: row.tickets_sold,
    revenue: row.revenue,
  }));

  const weeklySales = buildPeriodData(periodRows, "week");
  const monthlySales = buildPeriodData(periodRows, "month");

  const metrics: ReportMetric[] = [
    {
      label: "Weekly Sales",
      value: weeklySales[weeklySales.length - 1]?.tickets ?? 0,
    },
    {
      label: "Monthly Sales",
      value: monthlySales[monthlySales.length - 1]?.tickets ?? 0,
    },
    {
      label: "Expected Attendance",
      value: tableRows.reduce((sum, row) => sum + row.expected_attendees, 0),
    },
    {
      label: "Actual Attendance",
      value: tableRows.reduce((sum, row) => sum + row.actual_attendees, 0),
    },
  ];

  return {
    metrics,
    weeklySales,
    monthlySales,
    attendanceReport: tableRows
      .slice()
      .sort((a, b) => b.actual_attendees - a.actual_attendees)
      .slice(0, 10)
      .map((row) => ({
        name: row.name,
        attendance: row.actual_attendees,
      })),
    revenueReport: tableRows
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((row) => ({
        name: row.name,
        revenue: row.revenue,
      })),
    eventSummaryRows: tableRows.map((row) => {
      const comparison = calculateAttendanceComparison(
        row.expected_attendees,
        row.actual_attendees,
      );
      return {
        ...row,
        attendance_variance: comparison.variance,
        attendance_rate: comparison.rate,
      };
    }),
  };
}

export async function getVenues() {
  const context = await requireAuthContext();
  return prisma.venue.findMany({
    where: {
      workspace_id: context.workspaceId,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
    },
  });
}

export async function getPreferredVenueForNewEvent() {
  const context = await requireAuthContext();
  const latestEventWithVenue = await prisma.event.findFirst({
    where: {
      workspace_id: context.workspaceId,
      venue_id: {
        not: null,
      },
    },
    orderBy: {
      created_at: "desc",
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!latestEventWithVenue?.venue) {
    return null;
  }

  return latestEventWithVenue.venue;
}
