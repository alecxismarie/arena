import { EventStatus } from "@prisma/client";
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

type Trend = "up" | "down" | "neutral";

export type EventRecord = {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  status: EventStatus;
  capacity: number;
  expected_attendees: number;
  ticket_price: number;
  tickets_sold: number;
  actual_attendees: number;
  revenue: number;
  venue: {
    id: string;
    name: string;
  } | null;
};

type ReportMetric = {
  label: string;
  value: number;
};

type HistoricalEventRow = {
  id: string;
  name: string;
  date: Date;
  end_time: Date;
  venue_id: string | null;
  expected_attendees: number;
  tickets_sold: number;
  attendance_count: number;
};

type SimilarityMatchStrategy =
  | "venue_day_of_week"
  | "venue_only"
  | "recent_completed";

type EventIntelligence = {
  insufficientData: boolean;
  message: string;
  sampleSize: number;
  strategy: SimilarityMatchStrategy | "none";
  strategyLabel: string;
  averages: {
    expected_attendees: number;
    actual_attendees: number;
    tickets_sold: number;
    attendance_rate: number;
  } | null;
  turnoutRange: {
    min: number;
    max: number;
    label: string;
  } | null;
  expectedComparison: {
    deltaFromAverage: number;
    position: "above" | "below" | "aligned";
  } | null;
  trend: Array<{
    id: string;
    name: string;
    date: Date;
    expected_attendees: number;
    actual_attendees: number;
    tickets_sold: number;
    attendance_rate: number;
  }>;
};

type EventWithVenue = {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  status: EventStatus;
  capacity: number;
  expected_attendees: number;
  ticket_price: unknown;
  tickets_sold: number;
  attendance_count: number;
  revenue: unknown;
  venue?: {
    id: string;
    name: string;
  } | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function percentageChange(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function toTrend(change: number): Trend {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
}

function normalizeEventStatus(endTime: Date, status: EventStatus): EventStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (endTime < new Date()) return "completed";
  return "upcoming";
}

function mapEventRecord(event: EventWithVenue): EventRecord {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date,
    start_time: event.start_time,
    end_time: event.end_time,
    status: normalizeEventStatus(event.end_time, event.status),
    capacity: event.capacity,
    expected_attendees: event.expected_attendees,
    ticket_price: toNumber(event.ticket_price),
    tickets_sold: event.tickets_sold,
    actual_attendees: event.attendance_count,
    revenue: toNumber(event.revenue),
    venue: event.venue
      ? {
          id: event.venue.id,
          name: event.venue.name,
        }
      : null,
  };
}

function calculateAttendanceComparison(expected: number, actual: number) {
  const variance = actual - expected;
  const rate = expected > 0 ? actual / expected : 0;
  return {
    expected,
    actual,
    variance,
    rate,
  };
}

function attendanceRate(actualAttendees: number, expectedAttendees: number) {
  if (expectedAttendees <= 0) return 0;
  return actualAttendees / expectedAttendees;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues: number[], percentileRank: number) {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((sortedValues.length - 1) * percentileRank);
  return sortedValues[index];
}

function calculateTurnoutRange(actuals: number[]) {
  if (actuals.length === 0) return null;
  const sorted = actuals.slice().sort((a, b) => a - b);

  if (sorted.length >= 6) {
    const lower = percentile(sorted, 0.2);
    const upper = percentile(sorted, 0.8);
    return {
      min: Math.round(lower),
      max: Math.round(upper),
      label: "Typical attendance range (20th-80th percentile)",
    };
  }

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    label: "Attendance range (min-max)",
  };
}

function pickComparableEvents(
  currentEvent: EventRecord,
  historicalRows: HistoricalEventRow[],
) {
  const minimumComparableSize = 3;
  const currentEventWeekday = currentEvent.date.getDay();

  const sameVenueRows = historicalRows.filter(
    (row) => row.venue_id === (currentEvent.venue?.id ?? null),
  );

  const sameVenueDayRows = sameVenueRows.filter(
    (row) => row.date.getDay() === currentEventWeekday,
  );

  if (sameVenueDayRows.length >= minimumComparableSize) {
    return {
      strategy: "venue_day_of_week" as const,
      strategyLabel: "venue and day of week",
      rows: sameVenueDayRows,
    };
  }

  if (sameVenueRows.length >= minimumComparableSize) {
    return {
      strategy: "venue_only" as const,
      strategyLabel: "venue",
      rows: sameVenueRows,
    };
  }

  return {
    strategy: "recent_completed" as const,
    strategyLabel: "recent completed events",
    rows: historicalRows.slice(0, 12),
  };
}

function buildEventIntelligence(
  currentEvent: EventRecord,
  historicalRows: HistoricalEventRow[],
): EventIntelligence {
  const picked = pickComparableEvents(currentEvent, historicalRows);
  const comparable = picked.rows.slice(0, 12);

  if (comparable.length < 2) {
    return {
      insufficientData: true,
      message: "Not enough similar event history yet.",
      sampleSize: comparable.length,
      strategy: "none",
      strategyLabel: "insufficient history",
      averages: null,
      turnoutRange: null,
      expectedComparison: null,
      trend: [],
    };
  }

  const comparableRates = comparable.map((row) =>
    attendanceRate(row.attendance_count, row.expected_attendees),
  );
  const averages = {
    expected_attendees: average(comparable.map((row) => row.expected_attendees)),
    actual_attendees: average(comparable.map((row) => row.attendance_count)),
    tickets_sold: average(comparable.map((row) => row.tickets_sold)),
    attendance_rate: average(comparableRates),
  };

  const turnoutRange = calculateTurnoutRange(
    comparable.map((row) => row.attendance_count),
  );

  const expectedDelta = currentEvent.expected_attendees - averages.expected_attendees;
  const expectedComparison =
    Math.abs(expectedDelta) < 1
      ? {
          deltaFromAverage: 0,
          position: "aligned" as const,
        }
      : {
          deltaFromAverage: expectedDelta,
          position: expectedDelta > 0 ? ("above" as const) : ("below" as const),
        };

  const trend = comparable
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row) => ({
      id: row.id,
      name: row.name,
      date: row.date,
      expected_attendees: row.expected_attendees,
      actual_attendees: row.attendance_count,
      tickets_sold: row.tickets_sold,
      attendance_rate: attendanceRate(row.attendance_count, row.expected_attendees),
    }));

  return {
    insufficientData: false,
    message: `Based on ${comparable.length} comparable completed events (${picked.strategyLabel}).`,
    sampleSize: comparable.length,
    strategy: picked.strategy,
    strategyLabel: picked.strategyLabel,
    averages,
    turnoutRange,
    expectedComparison,
    trend,
  };
}

export async function getDashboardData() {
  const now = new Date();
  const weekStart = subDays(now, 7);
  const prevWeekStart = subDays(now, 14);

  const [
    eventTotals,
    currentWeekTotals,
    previousWeekTotals,
    currentWeekEvents,
    previousWeekEvents,
    recentEventRows,
    attendanceRows,
    distributionRows,
  ] = await Promise.all([
    prisma.event.aggregate({
      _count: { id: true },
      _sum: {
        expected_attendees: true,
        tickets_sold: true,
        attendance_count: true,
        revenue: true,
      },
    }),
    prisma.event.aggregate({
      _sum: {
        expected_attendees: true,
        tickets_sold: true,
        attendance_count: true,
        revenue: true,
      },
      where: {
        date: {
          gte: weekStart,
          lte: now,
        },
      },
    }),
    prisma.event.aggregate({
      _sum: {
        expected_attendees: true,
        tickets_sold: true,
        attendance_count: true,
        revenue: true,
      },
      where: {
        date: {
          gte: prevWeekStart,
          lt: weekStart,
        },
      },
    }),
    prisma.event.count({
      where: {
        date: {
          gte: weekStart,
          lte: now,
        },
      },
    }),
    prisma.event.count({
      where: {
        date: {
          gte: prevWeekStart,
          lt: weekStart,
        },
      },
    }),
    prisma.event.findMany({
      where: {
        date: {
          gte: subMonths(now, 6),
          lte: now,
        },
      },
      select: {
        date: true,
        tickets_sold: true,
        revenue: true,
      },
      orderBy: {
        date: "asc",
      },
    }),
    prisma.event.findMany({
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

  const ticketChange = percentageChange(
    currentWeekTotals._sum.tickets_sold ?? 0,
    previousWeekTotals._sum.tickets_sold ?? 0,
  );
  const revenueChange = percentageChange(
    toNumber(currentWeekTotals._sum.revenue),
    toNumber(previousWeekTotals._sum.revenue),
  );
  const attendanceChange = percentageChange(
    currentWeekTotals._sum.attendance_count ?? 0,
    previousWeekTotals._sum.attendance_count ?? 0,
  );
  const eventChange = percentageChange(currentWeekEvents, previousWeekEvents);

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

  recentEventRows.forEach((row) => {
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

  const overallExpected = eventTotals._sum.expected_attendees ?? 0;
  const overallActual = eventTotals._sum.attendance_count ?? 0;

  return {
    stats: [
      {
        key: "events",
        label: "Total Events",
        value: eventTotals._count.id ?? 0,
        change: eventChange,
        trend: toTrend(eventChange),
      },
      {
        key: "tickets",
        label: "Tickets Sold",
        value: eventTotals._sum.tickets_sold ?? 0,
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
        value: toNumber(eventTotals._sum.revenue),
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
  const events = await prisma.event.findMany({
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
  const event = await prisma.event.findUnique({
    where: { id: eventId },
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

  const intelligence = buildEventIntelligence(mapped, historicalRows);

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

function buildPeriodData(
  rows: Array<{ date: Date; tickets_sold: number; revenue: unknown }>,
  period: "week" | "month",
) {
  const now = new Date();
  const slots =
    period === "week"
      ? eachWeekOfInterval({
          start: startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 }),
          end: now,
        })
      : eachMonthOfInterval({
          start: subMonths(now, 5),
          end: now,
        });

  const map = new Map<string, { tickets: number; revenue: number }>();
  rows.forEach((row) => {
    const key =
      period === "week"
        ? format(startOfWeek(row.date, { weekStartsOn: 1 }), "yyyy-MM-dd")
        : format(row.date, "yyyy-MM");
    const current = map.get(key) ?? { tickets: 0, revenue: 0 };
    map.set(key, {
      tickets: current.tickets + row.tickets_sold,
      revenue: current.revenue + toNumber(row.revenue),
    });
  });

  return slots.map((date) => {
    const key =
      period === "week"
        ? format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
        : format(date, "yyyy-MM");
    const current = map.get(key) ?? { tickets: 0, revenue: 0 };
    return {
      label: period === "week" ? format(date, "MMM d") : format(date, "MMM"),
      tickets: current.tickets,
      revenue: current.revenue,
    };
  });
}

export async function getReportsData() {
  const events = await prisma.event.findMany({
    include: {
      venue: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { start_time: "desc" }],
  });

  const tableRows = events.map((event) => mapEventRecord(event));
  const periodRows = events.map((event) => ({
    date: event.date,
    tickets_sold: event.tickets_sold,
    revenue: event.revenue,
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
  return prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
    },
  });
}
