import "server-only";

import { subDays } from "date-fns";
import { unstable_cache } from "next/cache";
import { LegacySurfaceDomain } from "@/lib/domains/types";
import { prisma } from "@/lib/prisma";

// Legacy UI surface keys retained for backward compatibility.
// Canonical persisted domain identifiers live in src/lib/domains/types.ts.
export type DomainKey = LegacySurfaceDomain;

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

const CALENDAR_NAV_CACHE_SECONDS = 30;
const DOMAIN_USAGE_CACHE_SECONDS = 30;

export function getCalendarNavCacheTag(workspaceId: string) {
  return `calendar-nav:${workspaceId}`;
}

export function getDomainUsageCacheTag(workspaceId: string) {
  return `domain-usage:${workspaceId}`;
}

async function fetchCalendarNavAvailability(
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

export async function getCalendarNavAvailability(
  workspaceId: string,
): Promise<boolean> {
  const cacheTag = getCalendarNavCacheTag(workspaceId);
  return unstable_cache(
    async () => fetchCalendarNavAvailability(workspaceId),
    [cacheTag],
    { revalidate: CALENDAR_NAV_CACHE_SECONDS, tags: [cacheTag] },
  )();
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
  const cacheTag = getDomainUsageCacheTag(workspaceId);
  return unstable_cache(
    async () => {
      // Heuristic-only scoring fallback.
      // Explicit workspace domain configuration is resolved in
      // src/lib/workspace-domain-config.ts and should be preferred when present.
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
        inventory:
          inventoryReportCount * 2 +
          inventoryProductCount +
          recentInventoryReportCount * 3,
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
    },
    [cacheTag],
    { revalidate: DOMAIN_USAGE_CACHE_SECONDS, tags: [cacheTag] },
  )();
}
