import { requireAuthContext } from "@/lib/auth";
import { AssetRecordItem } from "@/lib/asset/types";
import {
  getAssetUtilizationMetrics,
  mapAssetUtilizationMetricsToLegacyAssessment,
} from "@/lib/domains/asset-utilization-metrics";
import { prisma } from "@/lib/prisma";

const DEFAULT_ASSET_PAGE_SIZE = 25;
const MAX_ASSET_PAGE_SIZE = 100;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mapAssetRecord(record: {
  id: string;
  asset_name: string;
  record_date: Date;
  total_assets: number;
  booked_assets: number;
  idle_assets: number;
  revenue: unknown;
  created_at: Date;
  updated_at: Date;
}): AssetRecordItem {
  return {
    id: record.id,
    asset_name: record.asset_name,
    record_date: record.record_date,
    total_assets: record.total_assets,
    booked_assets: record.booked_assets,
    idle_assets: record.idle_assets,
    revenue: record.revenue === null ? null : toNumber(record.revenue),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function normalizePage(value: number | undefined) {
  if (!value || !Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

function normalizePageSize(value: number | undefined) {
  if (!value || !Number.isFinite(value) || value < 1) {
    return DEFAULT_ASSET_PAGE_SIZE;
  }
  return Math.min(Math.floor(value), MAX_ASSET_PAGE_SIZE);
}

export async function getAssetRecords() {
  const context = await requireAuthContext();
  const rows = await prisma.assetRecord.findMany({
    where: {
      workspace_id: context.workspaceId,
    },
    orderBy: [{ record_date: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      asset_name: true,
      record_date: true,
      total_assets: true,
      booked_assets: true,
      idle_assets: true,
      revenue: true,
      created_at: true,
      updated_at: true,
    },
  });

  return rows.map((row) => mapAssetRecord(row));
}

export async function getAssetRecordsPage(params?: {
  page?: number;
  pageSize?: number;
}) {
  const context = await requireAuthContext();
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const skip = (page - 1) * pageSize;

  const [totalCount, rows] = await Promise.all([
    prisma.assetRecord.count({
      where: {
        workspace_id: context.workspaceId,
      },
    }),
    prisma.assetRecord.findMany({
      where: {
        workspace_id: context.workspaceId,
      },
      orderBy: [{ record_date: "desc" }, { created_at: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        asset_name: true,
        record_date: true,
        total_assets: true,
        booked_assets: true,
        idle_assets: true,
        revenue: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const boundedPage = Math.min(page, pageCount);

  if (boundedPage !== page) {
    return getAssetRecordsPage({
      page: boundedPage,
      pageSize,
    });
  }

  return {
    page,
    pageSize,
    pageCount,
    totalCount,
    records: rows.map((row) => mapAssetRecord(row)),
  };
}

export async function getAssetUtilizationData() {
  const records = await getAssetRecords();
  const domainMetricsResult = getAssetUtilizationMetrics({
    records,
  });
  const assessment =
    mapAssetUtilizationMetricsToLegacyAssessment(domainMetricsResult);

  return {
    records,
    assessment,
    // Additive compatibility surface: existing callers can ignore this while
    // standardized asset contract adoption expands across pages.
    domainMetrics: domainMetricsResult.metrics,
  };
}
