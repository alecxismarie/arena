import { requireAuthContext } from "@/lib/auth";
import { inventoryPerformanceInsightAdapter } from "@/lib/domains/inventory-performance-adapter";
import { InventoryRecordItem } from "@/lib/inventory/types";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mapInventoryRecord(record: {
  id: string;
  product_name: string;
  record_date: Date;
  units_in: number;
  units_out: number;
  remaining_stock: number;
  waste_units: number;
  revenue: unknown;
  created_at: Date;
  updated_at: Date;
}): InventoryRecordItem {
  return {
    id: record.id,
    product_name: record.product_name,
    record_date: record.record_date,
    units_in: record.units_in,
    units_out: record.units_out,
    remaining_stock: record.remaining_stock,
    waste_units: record.waste_units,
    revenue: record.revenue === null ? null : toNumber(record.revenue),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function getInventoryRecords() {
  const context = await requireAuthContext();
  const rows = await prisma.inventoryRecord.findMany({
    where: {
      workspace_id: context.workspaceId,
    },
    orderBy: [{ record_date: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      product_name: true,
      record_date: true,
      units_in: true,
      units_out: true,
      remaining_stock: true,
      waste_units: true,
      revenue: true,
      created_at: true,
      updated_at: true,
    },
  });

  return rows.map((row) => mapInventoryRecord(row));
}

export async function getInventoryPerformanceData() {
  const records = await getInventoryRecords();
  const assessment =
    inventoryPerformanceInsightAdapter.computeDeterministicInsights({
      records,
    });

  return {
    records,
    assessment,
  };
}
