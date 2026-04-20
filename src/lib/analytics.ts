import { requireAuthContext } from "@/lib/auth";
import { calculateAttendanceComparison } from "@/lib/analytics/metrics";
import { mapEventRecord } from "@/lib/analytics/event-mapping";
import { EventRecord } from "@/lib/analytics/types";
import {
  buildEventPerformanceDetailDomainMetrics,
  getEventPerformanceMetrics,
  mapEventPerformanceMetricsToLegacyDashboardData,
  mapEventPerformanceMetricsToLegacyReportsData,
} from "@/lib/domains/event-performance-metrics";
import { prisma } from "@/lib/prisma";
import { addMonths, endOfDay, format, startOfDay, subMonths } from "date-fns";

export type { EventRecord };

export async function getDashboardData() {
  const context = await requireAuthContext();
  const { metrics } = await getEventPerformanceMetrics({
    workspaceId: context.workspaceId,
  });
  return {
    ...mapEventPerformanceMetricsToLegacyDashboardData(metrics),
    // Transitional Phase 4A surface for direct UI consumption.
    domainMetrics: metrics,
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

  const detailMetrics = buildEventPerformanceDetailDomainMetrics({
    event: mapped,
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
    intelligence: detailMetrics.intelligence,
    // Additive compatibility surface: existing callers can ignore this while
    // Phase 2 adoption moves toward standardized domain metrics payloads.
    domainMetrics: detailMetrics.metrics,
  };
}

export async function getReportsData(params?: {
  tablePage?: number;
  tablePageSize?: number;
  includeEventSummaryRows?: boolean;
}) {
  const context = await requireAuthContext();
  const hasTablePagination =
    typeof params?.tablePage === "number" ||
    typeof params?.tablePageSize === "number";
  const tablePage = typeof params?.tablePage === "number" ? params.tablePage : 1;
  const tablePageSize =
    typeof params?.tablePageSize === "number" ? params.tablePageSize : 30;
  const includeEventSummaryRows = params?.includeEventSummaryRows ?? true;
  const { metrics, context: metricsContext } = await getEventPerformanceMetrics({
    workspaceId: context.workspaceId,
    includeTableRows: includeEventSummaryRows
      ? hasTablePagination
        ? {
            page: tablePage,
            pageSize: tablePageSize,
          }
        : true
      : false,
  });

  if (
    hasTablePagination &&
    includeEventSummaryRows &&
    tablePage > 1 &&
    metricsContext.tableRowsTotalCount > 0 &&
    metricsContext.tableRows.length === 0
  ) {
    const boundedPage = Math.max(
      1,
      Math.ceil(metricsContext.tableRowsTotalCount / tablePageSize),
    );
    if (boundedPage !== tablePage) {
      return getReportsData({
        tablePage: boundedPage,
        tablePageSize,
        includeEventSummaryRows: true,
      });
    }
  }

  return {
    ...mapEventPerformanceMetricsToLegacyReportsData({
      metrics,
      tableRows: metricsContext.tableRows,
    }),
    eventSummaryRowCount: metricsContext.tableRowsTotalCount,
    // Transitional Phase 4A surface for direct UI consumption.
    domainMetrics: metrics,
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
