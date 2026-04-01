import "server-only";

import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function recomputeWorkspaceDailyAggregates(workspaceId: string) {
  const grouped = await prisma.event.groupBy({
    by: ["date"],
    where: {
      workspace_id: workspaceId,
    },
    _count: {
      _all: true,
    },
    _sum: {
      expected_attendees: true,
      tickets_sold: true,
      attendance_count: true,
      revenue: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.workspaceDailyAggregate.deleteMany({
      where: {
        workspace_id: workspaceId,
      },
    });

    if (grouped.length === 0) {
      return;
    }

    await tx.workspaceDailyAggregate.createMany({
      data: grouped.map((row) => ({
        workspace_id: workspaceId,
        date: row.date,
        event_count: row._count._all,
        expected_attendees: row._sum.expected_attendees ?? 0,
        tickets_sold: row._sum.tickets_sold ?? 0,
        attendance_count: row._sum.attendance_count ?? 0,
        revenue: Number(toNumber(row._sum.revenue).toFixed(2)),
      })),
    });
  });
}

export async function ensureWorkspaceDailyAggregates(workspaceId: string) {
  const existingCount = await prisma.workspaceDailyAggregate.count({
    where: {
      workspace_id: workspaceId,
    },
  });
  if (existingCount > 0) {
    return;
  }

  const eventCount = await prisma.event.count({
    where: {
      workspace_id: workspaceId,
    },
  });
  if (eventCount === 0) {
    return;
  }

  await recomputeWorkspaceDailyAggregates(workspaceId);
}

export async function getWorkspaceDailyAggregates(params: {
  workspaceId: string;
  from?: Date;
  to?: Date;
}) {
  await ensureWorkspaceDailyAggregates(params.workspaceId);

  return prisma.workspaceDailyAggregate.findMany({
    where: {
      workspace_id: params.workspaceId,
      date: {
        gte: params.from,
        lte: params.to,
      },
    },
    orderBy: {
      date: "asc",
    },
    select: {
      date: true,
      event_count: true,
      expected_attendees: true,
      tickets_sold: true,
      attendance_count: true,
      revenue: true,
    },
  });
}
