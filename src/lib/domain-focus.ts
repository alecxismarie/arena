import "server-only";

import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export type DomainKey = "events" | "inventory" | "assets";

export type DomainUsageSignals = {
  primaryDomain: DomainKey;
  scores: Record<DomainKey, number>;
  counts: {
    events: number;
    inventoryReports: number;
    inventoryProducts: number;
    assets: number;
  };
};

export async function getCalendarNavAvailability(
  workspaceId: string,
): Promise<boolean> {
  const [hasEvent, hasAssetRecord] = await Promise.all([
    prisma.event.findFirst({
      where: { workspace_id: workspaceId },
      select: { id: true },
    }),
    prisma.assetRecord.findFirst({
      where: { workspace_id: workspaceId },
      select: { id: true },
    }),
  ]);

  return Boolean(hasEvent || hasAssetRecord);
}

const DOMAIN_TIE_BREAKER: DomainKey[] = ["inventory", "assets", "events"];

function resolvePrimaryDomain(scores: Record<DomainKey, number>): DomainKey {
  const highest = Math.max(scores.events, scores.inventory, scores.assets);
  for (const domain of DOMAIN_TIE_BREAKER) {
    if (scores[domain] === highest) {
      return domain;
    }
  }
  return "inventory";
}

export async function getDomainUsageSignals(
  workspaceId: string,
): Promise<DomainUsageSignals> {
  const recentFrom = subDays(new Date(), 30);

  const [
    eventCount,
    recentEventCount,
    inventoryReportCount,
    recentInventoryReportCount,
    inventoryProductCount,
    assetRecordCount,
    recentAssetRecordCount,
  ] = await Promise.all([
    prisma.event.count({
      where: {
        workspace_id: workspaceId,
      },
    }),
    prisma.event.count({
      where: {
        workspace_id: workspaceId,
        date: {
          gte: recentFrom,
        },
      },
    }),
    prisma.dailyProductReport.count({
      where: {
        workspace_id: workspaceId,
      },
    }),
    prisma.dailyProductReport.count({
      where: {
        workspace_id: workspaceId,
        report_date: {
          gte: recentFrom,
        },
      },
    }),
    prisma.product.count({
      where: {
        workspace_id: workspaceId,
      },
    }),
    prisma.assetRecord.count({
      where: {
        workspace_id: workspaceId,
      },
    }),
    prisma.assetRecord.count({
      where: {
        workspace_id: workspaceId,
        record_date: {
          gte: recentFrom,
        },
      },
    }),
  ]);

  const scores: Record<DomainKey, number> = {
    events: eventCount * 2 + recentEventCount * 3,
    inventory: inventoryReportCount * 2 + inventoryProductCount + recentInventoryReportCount * 3,
    assets: assetRecordCount * 2 + recentAssetRecordCount * 3,
  };

  return {
    primaryDomain: resolvePrimaryDomain(scores),
    scores,
    counts: {
      events: eventCount,
      inventoryReports: inventoryReportCount,
      inventoryProducts: inventoryProductCount,
      assets: assetRecordCount,
    },
  };
}
