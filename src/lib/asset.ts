import { requireAuthContext } from "@/lib/auth";
import { AssetRecordItem } from "@/lib/asset/types";
import { assetUtilizationInsightAdapter } from "@/lib/domains/asset-utilization-adapter";
import { prisma } from "@/lib/prisma";

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

export async function getAssetUtilizationData() {
  const records = await getAssetRecords();
  const assessment = assetUtilizationInsightAdapter.computeDeterministicInsights({
    records,
  });

  return {
    records,
    assessment,
  };
}
