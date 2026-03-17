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
  ticket_price: number;
  tickets_sold: number;
  attendance_count: number;
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

type EventWithVenue = {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  status: EventStatus;
  capacity: number;
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

function normalizeEventStatus(eventDate: Date, status: EventStatus) {
  if (status === "cancelled") return "cancelled";
  if (eventDate < new Date()) return "completed";
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
    status: normalizeEventStatus(event.date, event.status),
    capacity: event.capacity,
    ticket_price: toNumber(event.ticket_price),
    tickets_sold: event.tickets_sold,
    attendance_count: event.attendance_count,
    revenue: toNumber(event.revenue),
    venue: event.venue
      ? {
          id: event.venue.id,
          name: event.venue.name,
        }
      : null,
  };
}

export async function getDashboardData() {
  const now = new Date();
  const weekStart = subDays(now, 7);
  const prevWeekStart = subDays(now, 14);

  const [
    eventTotals,
    currentWeekSales,
    previousWeekSales,
    currentWeekAttendance,
    previousWeekAttendance,
    currentWeekEvents,
    previousWeekEvents,
    recentRevenueRows,
    recentSalesRows,
    attendanceRows,
    distributionRows,
  ] = await Promise.all([
    prisma.event.aggregate({
      _count: { id: true },
      _sum: {
        tickets_sold: true,
        attendance_count: true,
        revenue: true,
      },
    }),
    prisma.ticketSale.aggregate({
      _sum: {
        quantity: true,
        total_price: true,
      },
      where: {
        created_at: {
          gte: weekStart,
          lte: now,
        },
      },
    }),
    prisma.ticketSale.aggregate({
      _sum: {
        quantity: true,
        total_price: true,
      },
      where: {
        created_at: {
          gte: prevWeekStart,
          lt: weekStart,
        },
      },
    }),
    prisma.event.aggregate({
      _sum: { attendance_count: true },
      where: {
        date: {
          gte: weekStart,
          lte: now,
        },
      },
    }),
    prisma.event.aggregate({
      _sum: { attendance_count: true },
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
    prisma.ticketSale.findMany({
      where: {
        created_at: {
          gte: subMonths(now, 6),
          lte: now,
        },
      },
      select: {
        created_at: true,
        total_price: true,
      },
      orderBy: {
        created_at: "asc",
      },
    }),
    prisma.ticketSale.findMany({
      where: {
        created_at: {
          gte: subDays(now, 30),
          lte: now,
        },
      },
      select: {
        created_at: true,
        quantity: true,
      },
      orderBy: {
        created_at: "asc",
      },
    }),
    prisma.event.findMany({
      take: 8,
      orderBy: [{ attendance_count: "desc" }, { date: "desc" }],
      select: {
        id: true,
        name: true,
        attendance_count: true,
        status: true,
        date: true,
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
    currentWeekSales._sum.quantity ?? 0,
    previousWeekSales._sum.quantity ?? 0,
  );
  const revenueChange = percentageChange(
    toNumber(currentWeekSales._sum.total_price),
    toNumber(previousWeekSales._sum.total_price),
  );
  const attendanceChange = percentageChange(
    currentWeekAttendance._sum.attendance_count ?? 0,
    previousWeekAttendance._sum.attendance_count ?? 0,
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

  recentRevenueRows.forEach((row) => {
    const weekKey = format(startOfWeek(row.created_at, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthKey = format(row.created_at, "yyyy-MM");
    weeklyRevenueMap.set(weekKey, (weeklyRevenueMap.get(weekKey) ?? 0) + toNumber(row.total_price));
    monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) ?? 0) + toNumber(row.total_price));
  });

  recentSalesRows.forEach((row) => {
    const dayKey = format(row.created_at, "yyyy-MM-dd");
    salesByDayMap.set(dayKey, (salesByDayMap.get(dayKey) ?? 0) + row.quantity);
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
        label: "Attendance",
        value: eventTotals._sum.attendance_count ?? 0,
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
    weeklyRevenueTrend,
    monthlyRevenueTrend,
    salesTrend,
    attendanceByEvent: attendanceRows.map((row) => ({
      id: row.id,
      name: row.name,
      attendance: row.attendance_count,
      status: normalizeEventStatus(row.date, row.status),
    })),
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
      ticket_sales: {
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          quantity: true,
          total_price: true,
          created_at: true,
        },
      },
    },
  });

  if (!event) return null;

  const salesByDay = new Map<string, { tickets: number; revenue: number }>();
  event.ticket_sales.forEach((sale) => {
    const key = format(sale.created_at, "yyyy-MM-dd");
    const current = salesByDay.get(key) ?? { tickets: 0, revenue: 0 };
    salesByDay.set(key, {
      tickets: current.tickets + sale.quantity,
      revenue: current.revenue + toNumber(sale.total_price),
    });
  });

  const salesTrend = Array.from(salesByDay.entries()).map(([key, value]) => ({
    label: format(new Date(key), "MMM d"),
    tickets: value.tickets,
    revenue: value.revenue,
  }));

  return {
    event: mapEventRecord(event),
    salesTrend,
    ticketSalesCount: event.ticket_sales.length,
  };
}

function buildPeriodData(
  rows: Array<{ created_at: Date; quantity: number; total_price: unknown }>,
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
        ? format(startOfWeek(row.created_at, { weekStartsOn: 1 }), "yyyy-MM-dd")
        : format(row.created_at, "yyyy-MM");
    const current = map.get(key) ?? { tickets: 0, revenue: 0 };
    map.set(key, {
      tickets: current.tickets + row.quantity,
      revenue: current.revenue + toNumber(row.total_price),
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
  const [salesRows, events] = await Promise.all([
    prisma.ticketSale.findMany({
      where: {
        created_at: {
          gte: subMonths(new Date(), 6),
        },
      },
      select: {
        created_at: true,
        quantity: true,
        total_price: true,
      },
      orderBy: {
        created_at: "asc",
      },
    }),
    prisma.event.findMany({
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
  ]);

  const weeklySales = buildPeriodData(salesRows, "week");
  const monthlySales = buildPeriodData(salesRows, "month");
  const tableRows = events.map((event) => mapEventRecord(event));

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
      label: "Attendance",
      value: tableRows.reduce((sum, row) => sum + row.attendance_count, 0),
    },
    {
      label: "Revenue",
      value: tableRows.reduce((sum, row) => sum + row.revenue, 0),
    },
  ];

  return {
    metrics,
    weeklySales,
    monthlySales,
    attendanceReport: tableRows
      .slice()
      .sort((a, b) => b.attendance_count - a.attendance_count)
      .slice(0, 10)
      .map((row) => ({
        name: row.name,
        attendance: row.attendance_count,
      })),
    revenueReport: tableRows
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((row) => ({
        name: row.name,
        revenue: row.revenue,
      })),
    eventSummaryRows: tableRows,
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
