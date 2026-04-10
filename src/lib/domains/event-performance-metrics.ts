import "server-only";

import { EventStatus } from "@prisma/client";
import {
  calculateAttendanceComparison,
  percentageChange,
  toTrend,
} from "@/lib/analytics/metrics";
import { buildPeriodData } from "@/lib/analytics/period-aggregation";
import { EventIntelligence, HistoricalEventRow } from "@/lib/analytics/event-intelligence";
import { mapEventRecord, normalizeEventStatus, toNumber } from "@/lib/analytics/event-mapping";
import { EventRecord } from "@/lib/analytics/types";
import { eventPerformanceInsightAdapter } from "@/lib/domains/event-performance-adapter";
import {
  InsightMetricItem,
  RankingMetricItem,
  StandardizedDomainMetricsContract,
  TrendSeriesPoint,
} from "@/lib/domains/metrics-contract";
import { prisma } from "@/lib/prisma";
import { getWorkspaceDailyAggregates } from "@/lib/workspace-daily-aggregates";
import {
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

// Phase 2A foundational adapter:
// this file remains the canonical standardized implementation for event_performance.

type EventTotalKey =
  | "total_events"
  | "tickets_sold"
  | "actual_attendance"
  | "expected_attendance"
  | "revenue";

type EventRatioKey =
  | "attendance_rate"
  | "attendance_variance_rate"
  | "week_over_week_events_change"
  | "week_over_week_tickets_change"
  | "week_over_week_attendance_change"
  | "week_over_week_revenue_change";

type EventTrendKey =
  | "weekly_revenue"
  | "monthly_revenue"
  | "daily_tickets"
  | "weekly_sales"
  | "monthly_sales";

type EventRankingKey =
  | "attendance_by_event"
  | "ticket_distribution"
  | "attendance_report"
  | "revenue_report";

export type EventPerformanceDomainMetrics = StandardizedDomainMetricsContract<
  "event_performance",
  EventTotalKey,
  EventRatioKey,
  EventTrendKey,
  EventRankingKey
>;

export type EventPerformanceMetricsInput = {
  now: Date;
  periodStart: Date;
  periodEnd: Date;
  dailyAggregateRows: Awaited<ReturnType<typeof getWorkspaceDailyAggregates>>;
  attendanceRows: Array<{
    id: string;
    name: string;
    expected_attendees: number;
    attendance_count: number;
    status: EventStatus;
    end_time: Date;
  }>;
  distributionRows: Array<{
    id: string;
    name: string;
    tickets_sold: number;
  }>;
  tableRows: EventRecord[];
};

export type EventPerformanceMetricsResult = {
  metrics: EventPerformanceDomainMetrics;
  context: {
    tableRows: EventRecord[];
  };
};

type LegacyDashboardStat = {
  key: "events" | "tickets" | "attendance" | "revenue";
  label: string;
  value: number;
  change: number;
  trend: ReturnType<typeof toTrend>;
};

export type LegacyDashboardEventData = {
  stats: LegacyDashboardStat[];
  attendanceComparison: {
    expected: number;
    actual: number;
    variance: number;
    rate: number;
  };
  weeklyRevenueTrend: Array<{ label: string; revenue: number }>;
  monthlyRevenueTrend: Array<{ label: string; revenue: number }>;
  salesTrend: Array<{ label: string; tickets: number }>;
  attendanceByEvent: Array<{
    id: string;
    name: string;
    attendance: number;
    expected: number;
    variance: number;
    rate: number;
    status: EventStatus;
  }>;
  ticketDistribution: Array<{ id: string; name: string; tickets: number }>;
};

type ReportMetric = {
  label: string;
  value: number;
};

export type LegacyReportsEventData = {
  metrics: ReportMetric[];
  weeklySales: Array<{ label: string; tickets: number; revenue: number }>;
  monthlySales: Array<{ label: string; tickets: number; revenue: number }>;
  attendanceReport: Array<{ name: string; attendance: number }>;
  revenueReport: Array<{ name: string; revenue: number }>;
  eventSummaryRows: Array<
    EventRecord & {
      attendance_variance: number;
      attendance_rate: number;
    }
  >;
};

function numericMeta(item: RankingMetricItem, key: string) {
  const value = item.meta?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stringMeta(item: RankingMetricItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === "string" ? value : "";
}

function readTotal(
  metrics: EventPerformanceDomainMetrics,
  key: EventTotalKey,
) {
  return metrics.totals[key]?.value ?? 0;
}

function readRatio(
  metrics: EventPerformanceDomainMetrics,
  key: EventRatioKey,
) {
  return metrics.ratios[key]?.value ?? 0;
}

function readTrend(
  metrics: EventPerformanceDomainMetrics,
  key: EventTrendKey,
) {
  return metrics.trends[key]?.points ?? [];
}

function readRanking(
  metrics: EventPerformanceDomainMetrics,
  key: EventRankingKey,
) {
  return metrics.rankings[key] ?? [];
}

function buildEventPerformanceInsights(params: {
  totalEvents: number;
  attendanceRate: number;
  revenueChange: number;
  topAttendanceName: string | null;
}) {
  if (params.totalEvents === 0) {
    return [
      {
        key: "no_events",
        level: "neutral",
        message: "No event records yet. Add events to generate deterministic performance insights.",
      },
    ] satisfies InsightMetricItem[];
  }

  const insights: InsightMetricItem[] = [];

  if (params.attendanceRate >= 1) {
    insights.push({
      key: "attendance_above_plan",
      level: "positive",
      message: "Actual attendance is meeting or exceeding planned attendance.",
    });
  } else if (params.attendanceRate < 0.85) {
    insights.push({
      key: "attendance_below_plan",
      level: "warning",
      message: "Actual attendance is materially below planned attendance.",
    });
  } else {
    insights.push({
      key: "attendance_near_plan",
      level: "neutral",
      message: "Actual attendance is close to planned attendance.",
    });
  }

  if (params.revenueChange > 0) {
    insights.push({
      key: "revenue_up_week_over_week",
      level: "positive",
      message: "Revenue is up versus the previous week.",
    });
  } else if (params.revenueChange < 0) {
    insights.push({
      key: "revenue_down_week_over_week",
      level: "warning",
      message: "Revenue is down versus the previous week.",
    });
  } else {
    insights.push({
      key: "revenue_flat_week_over_week",
      level: "neutral",
      message: "Revenue is flat versus the previous week.",
    });
  }

  if (params.topAttendanceName) {
    insights.push({
      key: "top_attendance_event",
      level: "neutral",
      message: `${params.topAttendanceName} is currently leading attendance.`,
    });
  }

  return insights;
}

export function mapEventIntelligenceToInsights(
  intelligence: EventIntelligence,
): InsightMetricItem[] {
  const insights: InsightMetricItem[] = [
    {
      key: intelligence.insufficientData
        ? "event_intelligence_insufficient"
        : "event_intelligence_available",
      level: intelligence.insufficientData ? "neutral" : "positive",
      message: intelligence.message,
    },
  ];

  if (intelligence.expectedComparison) {
    if (intelligence.expectedComparison.position === "above") {
      insights.push({
        key: "event_expected_above_average",
        level: "neutral",
        message: "Expected attendance is above comparable-event average.",
      });
    } else if (intelligence.expectedComparison.position === "below") {
      insights.push({
        key: "event_expected_below_average",
        level: "warning",
        message: "Expected attendance is below comparable-event average.",
      });
    } else {
      insights.push({
        key: "event_expected_aligned_average",
        level: "neutral",
        message: "Expected attendance is aligned with comparable-event average.",
      });
    }
  }

  if (intelligence.turnoutRange) {
    insights.push({
      key: "event_turnout_range",
      level: "neutral",
      message: `Typical turnout range is ${Math.round(intelligence.turnoutRange.min)}-${Math.round(intelligence.turnoutRange.max)} attendees.`,
    });
  }

  return insights;
}

export async function fetchEventPerformanceMetricsInput(params: {
  workspaceId: string;
  now?: Date;
  includeTableRows?: boolean;
}): Promise<EventPerformanceMetricsInput> {
  const now = params.now ?? new Date();
  const periodStart = startOfDay(subMonths(now, 6));
  const periodEnd = endOfDay(now);

  const eventRowsPromise = params.includeTableRows
    ? prisma.event.findMany({
        where: {
          workspace_id: params.workspaceId,
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
      })
    : Promise.resolve([]);

  const [dailyAggregateRows, attendanceRows, distributionRows, eventRows] =
    await Promise.all([
      getWorkspaceDailyAggregates({
        workspaceId: params.workspaceId,
        from: periodStart,
        to: periodEnd,
      }),
      prisma.event.findMany({
        where: {
          workspace_id: params.workspaceId,
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
          workspace_id: params.workspaceId,
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
      eventRowsPromise,
    ]);

  return {
    now,
    periodStart,
    periodEnd,
    dailyAggregateRows,
    attendanceRows,
    distributionRows,
    tableRows: eventRows.map((event) => mapEventRecord(event)),
  };
}

export function buildEventPerformanceDomainMetrics(
  input: EventPerformanceMetricsInput,
): EventPerformanceDomainMetrics {
  const weekStart = subDays(input.now, 7);
  const prevWeekStart = subDays(input.now, 14);

  const totals = input.dailyAggregateRows.reduce(
    (acc, row) => ({
      events: acc.events + row.event_count,
      expectedAttendance: acc.expectedAttendance + row.expected_attendees,
      ticketsSold: acc.ticketsSold + row.tickets_sold,
      actualAttendance: acc.actualAttendance + row.attendance_count,
      revenue: acc.revenue + toNumber(row.revenue),
    }),
    {
      events: 0,
      expectedAttendance: 0,
      ticketsSold: 0,
      actualAttendance: 0,
      revenue: 0,
    },
  );

  const currentWeekTotals = input.dailyAggregateRows
    .filter((row) => row.date >= weekStart && row.date <= input.now)
    .reduce(
      (acc, row) => ({
        events: acc.events + row.event_count,
        ticketsSold: acc.ticketsSold + row.tickets_sold,
        actualAttendance: acc.actualAttendance + row.attendance_count,
        revenue: acc.revenue + toNumber(row.revenue),
      }),
      {
        events: 0,
        ticketsSold: 0,
        actualAttendance: 0,
        revenue: 0,
      },
    );

  const previousWeekTotals = input.dailyAggregateRows
    .filter((row) => row.date >= prevWeekStart && row.date < weekStart)
    .reduce(
      (acc, row) => ({
        events: acc.events + row.event_count,
        ticketsSold: acc.ticketsSold + row.tickets_sold,
        actualAttendance: acc.actualAttendance + row.attendance_count,
        revenue: acc.revenue + toNumber(row.revenue),
      }),
      {
        events: 0,
        ticketsSold: 0,
        actualAttendance: 0,
        revenue: 0,
      },
    );

  const eventChange = percentageChange(currentWeekTotals.events, previousWeekTotals.events);
  const ticketChange = percentageChange(
    currentWeekTotals.ticketsSold,
    previousWeekTotals.ticketsSold,
  );
  const attendanceChange = percentageChange(
    currentWeekTotals.actualAttendance,
    previousWeekTotals.actualAttendance,
  );
  const revenueChange = percentageChange(
    currentWeekTotals.revenue,
    previousWeekTotals.revenue,
  );

  const attendanceComparison = calculateAttendanceComparison(
    totals.expectedAttendance,
    totals.actualAttendance,
  );
  const attendanceVarianceRate =
    totals.expectedAttendance > 0
      ? attendanceComparison.variance / totals.expectedAttendance
      : 0;

  const weeklySlots = eachWeekOfInterval({
    start: startOfWeek(subWeeks(input.now, 11), { weekStartsOn: 1 }),
    end: input.now,
  });
  const monthlySlots = eachMonthOfInterval({
    start: subMonths(input.now, 5),
    end: input.now,
  });
  const dailySalesSlots = eachDayOfInterval({
    start: subDays(input.now, 29),
    end: input.now,
  });

  const weeklyRevenueMap = new Map<string, number>();
  const monthlyRevenueMap = new Map<string, number>();
  const salesByDayMap = new Map<string, number>();

  input.dailyAggregateRows.forEach((row) => {
    const weekKey = format(startOfWeek(row.date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthKey = format(row.date, "yyyy-MM");
    const dayKey = format(row.date, "yyyy-MM-dd");

    weeklyRevenueMap.set(weekKey, (weeklyRevenueMap.get(weekKey) ?? 0) + toNumber(row.revenue));
    monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) ?? 0) + toNumber(row.revenue));
    salesByDayMap.set(dayKey, (salesByDayMap.get(dayKey) ?? 0) + row.tickets_sold);
  });

  const weeklyRevenuePoints: TrendSeriesPoint[] = weeklySlots.map((date) => {
    const key = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    return {
      label: format(date, "MMM d"),
      value: weeklyRevenueMap.get(key) ?? 0,
      date,
    };
  });

  const monthlyRevenuePoints: TrendSeriesPoint[] = monthlySlots.map((date) => {
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM"),
      value: monthlyRevenueMap.get(key) ?? 0,
      date,
    };
  });

  const dailySalesPoints: TrendSeriesPoint[] = dailySalesSlots.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      label: format(day, "MMM d"),
      value: salesByDayMap.get(key) ?? 0,
      date: day,
    };
  });

  const periodRows = input.dailyAggregateRows.map((row) => ({
    date: row.date,
    tickets_sold: row.tickets_sold,
    revenue: row.revenue,
  }));
  const weeklySales = buildPeriodData(periodRows, "week");
  const monthlySales = buildPeriodData(periodRows, "month");

  const attendanceByEvent = input.attendanceRows.map((row) => {
    const comparison = calculateAttendanceComparison(
      row.expected_attendees,
      row.attendance_count,
    );
    return {
      id: row.id,
      label: row.name,
      value: row.attendance_count,
      meta: {
        expected: row.expected_attendees,
        variance: comparison.variance,
        rate: comparison.rate,
        status: normalizeEventStatus(row.end_time, row.status),
      },
    } satisfies RankingMetricItem;
  });

  const ticketDistribution = input.distributionRows.map((row) => ({
    id: row.id,
    label: row.name,
    value: row.tickets_sold,
  }));

  const attendanceReport = input.tableRows
    .slice()
    .sort((a, b) => b.actual_attendees - a.actual_attendees)
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      label: row.name,
      value: row.actual_attendees,
    }));

  const revenueReport = input.tableRows
    .slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      label: row.name,
      value: row.revenue,
    }));

  return {
    totals: {
      total_events: {
        key: "total_events",
        label: "Total Events",
        value: totals.events,
        unit: "count",
      },
      tickets_sold: {
        key: "tickets_sold",
        label: "Tickets Sold",
        value: totals.ticketsSold,
        unit: "count",
      },
      actual_attendance: {
        key: "actual_attendance",
        label: "Actual Attendance",
        value: totals.actualAttendance,
        unit: "count",
      },
      expected_attendance: {
        key: "expected_attendance",
        label: "Expected Attendance",
        value: totals.expectedAttendance,
        unit: "count",
      },
      revenue: {
        key: "revenue",
        label: "Revenue",
        value: totals.revenue,
        unit: "currency",
      },
    },
    ratios: {
      attendance_rate: {
        key: "attendance_rate",
        label: "Attendance Rate",
        value: attendanceComparison.rate,
        numerator: totals.actualAttendance,
        denominator: totals.expectedAttendance,
        unit: "percentage",
      },
      attendance_variance_rate: {
        key: "attendance_variance_rate",
        label: "Attendance Variance Rate",
        value: attendanceVarianceRate,
        numerator: attendanceComparison.variance,
        denominator: totals.expectedAttendance,
        unit: "percentage",
      },
      week_over_week_events_change: {
        key: "week_over_week_events_change",
        label: "Week over week event change",
        value: eventChange,
        numerator: currentWeekTotals.events,
        denominator: previousWeekTotals.events,
        unit: "percentage",
      },
      week_over_week_tickets_change: {
        key: "week_over_week_tickets_change",
        label: "Week over week tickets change",
        value: ticketChange,
        numerator: currentWeekTotals.ticketsSold,
        denominator: previousWeekTotals.ticketsSold,
        unit: "percentage",
      },
      week_over_week_attendance_change: {
        key: "week_over_week_attendance_change",
        label: "Week over week attendance change",
        value: attendanceChange,
        numerator: currentWeekTotals.actualAttendance,
        denominator: previousWeekTotals.actualAttendance,
        unit: "percentage",
      },
      week_over_week_revenue_change: {
        key: "week_over_week_revenue_change",
        label: "Week over week revenue change",
        value: revenueChange,
        numerator: currentWeekTotals.revenue,
        denominator: previousWeekTotals.revenue,
        unit: "percentage",
      },
    },
    trends: {
      weekly_revenue: {
        key: "weekly_revenue",
        label: "Weekly Revenue",
        granularity: "week",
        points: weeklyRevenuePoints,
      },
      monthly_revenue: {
        key: "monthly_revenue",
        label: "Monthly Revenue",
        granularity: "month",
        points: monthlyRevenuePoints,
      },
      daily_tickets: {
        key: "daily_tickets",
        label: "Daily Tickets (30 days)",
        granularity: "day",
        points: dailySalesPoints,
      },
      weekly_sales: {
        key: "weekly_sales",
        label: "Weekly Sales Report",
        granularity: "week",
        points: weeklySales.map((row) => ({
          label: row.label,
          value: row.tickets,
          date: null,
          meta: {
            revenue: row.revenue,
          },
        })),
      },
      monthly_sales: {
        key: "monthly_sales",
        label: "Monthly Sales Report",
        granularity: "month",
        points: monthlySales.map((row) => ({
          label: row.label,
          value: row.tickets,
          date: null,
          meta: {
            revenue: row.revenue,
          },
        })),
      },
    },
    rankings: {
      attendance_by_event: attendanceByEvent,
      ticket_distribution: ticketDistribution,
      attendance_report: attendanceReport,
      revenue_report: revenueReport,
    },
    insights: buildEventPerformanceInsights({
      totalEvents: totals.events,
      attendanceRate: attendanceComparison.rate,
      revenueChange,
      topAttendanceName: attendanceByEvent[0]?.label ?? null,
    }),
    metadata: {
      domain: "event_performance",
      generatedAt: input.now,
      period: {
        from: input.periodStart,
        to: input.periodEnd,
        label: "Last 6 months",
      },
      source: {
        mode: "deterministic",
        systems: ["workspace_daily_aggregate", "event"],
        notes: [
          "Event performance metrics are deterministic and normalized via the shared domain metrics contract.",
        ],
      },
      flags: {
        hasEvents: totals.events > 0,
      },
    },
  };
}

export async function getEventPerformanceMetrics(params: {
  workspaceId: string;
  now?: Date;
  includeTableRows?: boolean;
}): Promise<EventPerformanceMetricsResult> {
  const input = await fetchEventPerformanceMetricsInput(params);
  return {
    metrics: buildEventPerformanceDomainMetrics(input),
    context: {
      tableRows: input.tableRows,
    },
  };
}

export function mapEventPerformanceMetricsToLegacyDashboardData(
  metrics: EventPerformanceDomainMetrics,
): LegacyDashboardEventData {
  const expectedAttendance = readTotal(metrics, "expected_attendance");
  const actualAttendance = readTotal(metrics, "actual_attendance");

  const attendanceByEvent = readRanking(metrics, "attendance_by_event").map((item) => ({
    id: item.id,
    name: item.label,
    attendance: item.value,
    expected: numericMeta(item, "expected"),
    variance: numericMeta(item, "variance"),
    rate: numericMeta(item, "rate"),
    status: (stringMeta(item, "status") as EventStatus) || "upcoming",
  }));

  return {
    stats: [
      {
        key: "events",
        label: "Total Events",
        value: readTotal(metrics, "total_events"),
        change: readRatio(metrics, "week_over_week_events_change"),
        trend: toTrend(readRatio(metrics, "week_over_week_events_change")),
      },
      {
        key: "tickets",
        label: "Tickets Sold",
        value: readTotal(metrics, "tickets_sold"),
        change: readRatio(metrics, "week_over_week_tickets_change"),
        trend: toTrend(readRatio(metrics, "week_over_week_tickets_change")),
      },
      {
        key: "attendance",
        label: "Actual Attendance",
        value: actualAttendance,
        change: readRatio(metrics, "week_over_week_attendance_change"),
        trend: toTrend(readRatio(metrics, "week_over_week_attendance_change")),
      },
      {
        key: "revenue",
        label: "Revenue",
        value: readTotal(metrics, "revenue"),
        change: readRatio(metrics, "week_over_week_revenue_change"),
        trend: toTrend(readRatio(metrics, "week_over_week_revenue_change")),
      },
    ],
    attendanceComparison: {
      expected: expectedAttendance,
      actual: actualAttendance,
      variance: actualAttendance - expectedAttendance,
      rate: readRatio(metrics, "attendance_rate"),
    },
    weeklyRevenueTrend: readTrend(metrics, "weekly_revenue").map((point) => ({
      label: point.label,
      revenue: point.value,
    })),
    monthlyRevenueTrend: readTrend(metrics, "monthly_revenue").map((point) => ({
      label: point.label,
      revenue: point.value,
    })),
    salesTrend: readTrend(metrics, "daily_tickets").map((point) => ({
      label: point.label,
      tickets: point.value,
    })),
    attendanceByEvent,
    ticketDistribution: readRanking(metrics, "ticket_distribution").map((item) => ({
      id: item.id,
      name: item.label,
      tickets: item.value,
    })),
  };
}

export function mapEventPerformanceMetricsToLegacyReportsData(params: {
  metrics: EventPerformanceDomainMetrics;
  tableRows: EventRecord[];
}): LegacyReportsEventData {
  const weeklySales = readTrend(params.metrics, "weekly_sales").map((point) => ({
    label: point.label,
    tickets: point.value,
    revenue: typeof point.meta?.revenue === "number" ? point.meta.revenue : 0,
  }));
  const monthlySales = readTrend(params.metrics, "monthly_sales").map((point) => ({
    label: point.label,
    tickets: point.value,
    revenue: typeof point.meta?.revenue === "number" ? point.meta.revenue : 0,
  }));
  const expectedAttendance = params.tableRows.reduce(
    (sum, row) => sum + row.expected_attendees,
    0,
  );
  const actualAttendance = params.tableRows.reduce(
    (sum, row) => sum + row.actual_attendees,
    0,
  );

  return {
    metrics: [
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
        value: expectedAttendance,
      },
      {
        label: "Actual Attendance",
        value: actualAttendance,
      },
    ],
    weeklySales,
    monthlySales,
    attendanceReport: readRanking(params.metrics, "attendance_report").map((item) => ({
      name: item.label,
      attendance: item.value,
    })),
    revenueReport: readRanking(params.metrics, "revenue_report").map((item) => ({
      name: item.label,
      revenue: item.value,
    })),
    eventSummaryRows: params.tableRows.map((row) => {
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

export function buildEventPerformanceDetailDomainMetrics(params: {
  event: EventRecord;
  historicalRows: HistoricalEventRow[];
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const intelligence = eventPerformanceInsightAdapter.computeDeterministicInsights({
    currentEvent: params.event,
    historicalRows: params.historicalRows,
  });
  const attendanceComparison = calculateAttendanceComparison(
    params.event.expected_attendees,
    params.event.actual_attendees,
  );

  const metrics: EventPerformanceDomainMetrics = {
    totals: {
      total_events: {
        key: "total_events",
        label: "Total Events",
        value: 1,
        unit: "count",
      },
      tickets_sold: {
        key: "tickets_sold",
        label: "Tickets Sold",
        value: params.event.tickets_sold,
        unit: "count",
      },
      actual_attendance: {
        key: "actual_attendance",
        label: "Actual Attendance",
        value: params.event.actual_attendees,
        unit: "count",
      },
      expected_attendance: {
        key: "expected_attendance",
        label: "Expected Attendance",
        value: params.event.expected_attendees,
        unit: "count",
      },
      revenue: {
        key: "revenue",
        label: "Revenue",
        value: params.event.revenue,
        unit: "currency",
      },
    },
    ratios: {
      attendance_rate: {
        key: "attendance_rate",
        label: "Attendance Rate",
        value: attendanceComparison.rate,
        numerator: params.event.actual_attendees,
        denominator: params.event.expected_attendees,
        unit: "percentage",
      },
      attendance_variance_rate: {
        key: "attendance_variance_rate",
        label: "Attendance Variance Rate",
        value:
          params.event.expected_attendees > 0
            ? attendanceComparison.variance / params.event.expected_attendees
            : 0,
        numerator: attendanceComparison.variance,
        denominator: params.event.expected_attendees,
        unit: "percentage",
      },
    },
    trends: {
      daily_tickets: {
        key: "daily_tickets",
        label: "Event Sales",
        granularity: "day",
        points: [
          {
            label: format(params.event.date, "MMM d"),
            value: params.event.tickets_sold,
            date: params.event.date,
            meta: {
              revenue: params.event.revenue,
            },
          },
        ],
      },
    },
    rankings: {},
    insights: mapEventIntelligenceToInsights(intelligence),
    metadata: {
      domain: "event_performance",
      generatedAt: now,
      period: {
        from: params.event.date,
        to: params.event.date,
        label: "Single event context",
      },
      source: {
        mode: "deterministic",
        systems: ["event", "event_intelligence"],
      },
      flags: {
        historicalSampleSize: intelligence.sampleSize,
        insufficientData: intelligence.insufficientData,
      },
    },
  };

  return {
    intelligence,
    metrics,
  };
}
