import { requireAuthContext } from "@/lib/auth";
import { inventoryPerformanceInsightAdapter } from "@/lib/domains/inventory-performance-adapter";
import { computeDailyInventoryFinancials } from "@/lib/inventory/computation";
import { buildDailyBusinessSummary } from "@/lib/inventory/daily-summary";
import {
  DailyBusinessSummary,
  DailyProductReportItem,
  ProductItem,
} from "@/lib/inventory/types";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mapProduct(record: {
  id: string;
  name: string;
  selling_price: unknown;
  cost_price: unknown;
  category: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): ProductItem {
  return {
    id: record.id,
    name: record.name,
    selling_price: toNumber(record.selling_price),
    cost_price: toNumber(record.cost_price),
    category: record.category,
    is_active: record.is_active,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapDailyReport(record: {
  id: string;
  product_id: string;
  report_date: Date;
  beginning_stock: number;
  stock_added: number;
  ending_stock: number;
  waste_units: number;
  units_sold: number;
  revenue: unknown;
  cogs: unknown;
  gross_profit: unknown;
  created_at: Date;
  updated_at: Date;
  product: {
    name: string;
  };
}): DailyProductReportItem {
  return {
    id: record.id,
    product_id: record.product_id,
    product_name: record.product.name,
    report_date: record.report_date,
    beginning_stock: record.beginning_stock,
    stock_added: record.stock_added,
    ending_stock: record.ending_stock,
    waste_units: record.waste_units,
    units_sold: record.units_sold,
    revenue: toNumber(record.revenue),
    cogs: toNumber(record.cogs),
    gross_profit: toNumber(record.gross_profit),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

const ISO_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LOOKBACK_DAYS = 14;

export function normalizeInventoryDateKey(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!ISO_DATE_KEY_REGEX.test(normalized)) return null;
  return normalized;
}

function buildUtcDayRange(dateKey: string) {
  const [yearText, monthText, dayText] = dateKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1970 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error("Invalid summary date");
  }

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid summary date");
  }
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    throw new Error("Invalid summary date");
  }
  return { start, end };
}

async function fetchProductsForWorkspace(workspaceId: string) {
  const rows = await prisma.product.findMany({
    where: {
      workspace_id: workspaceId,
    },
    orderBy: [{ is_active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      selling_price: true,
      cost_price: true,
      category: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return rows.map((row) => mapProduct(row));
}

async function fetchDailyReportsForWorkspace(
  workspaceId: string,
  dateRange?: {
    start: Date;
    end: Date;
  },
) {
  const rows = await prisma.dailyProductReport.findMany({
    where: {
      workspace_id: workspaceId,
      report_date: dateRange
        ? {
            gte: dateRange.start,
            lt: dateRange.end,
          }
        : undefined,
    },
    orderBy: [{ report_date: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      product_id: true,
      report_date: true,
      beginning_stock: true,
      stock_added: true,
      ending_stock: true,
      waste_units: true,
      units_sold: true,
      revenue: true,
      cogs: true,
      gross_profit: true,
      created_at: true,
      updated_at: true,
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  return rows.map((row) => mapDailyReport(row));
}

async function fetchLookbackRevenueRows(
  workspaceId: string,
  selectedDateRange: {
    start: Date;
    end: Date;
  },
) {
  const lookbackStart = new Date(selectedDateRange.start);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - (DEFAULT_LOOKBACK_DAYS - 1));

  const rows = await prisma.dailyProductReport.findMany({
    where: {
      workspace_id: workspaceId,
      report_date: {
        gte: lookbackStart,
        lt: selectedDateRange.end,
      },
    },
    select: {
      report_date: true,
      revenue: true,
    },
    orderBy: {
      report_date: "asc",
    },
  });

  const byDate = rows.reduce((acc, row) => {
    const dateKey = row.report_date.toISOString().slice(0, 10);
    acc.set(dateKey, (acc.get(dateKey) ?? 0) + toNumber(row.revenue));
    return acc;
  }, new Map<string, number>());

  return Array.from(byDate.entries()).map(([dateKey, revenue]) => ({
    dateKey,
    revenue,
  }));
}

export async function getInventoryProducts() {
  const context = await requireAuthContext();
  return fetchProductsForWorkspace(context.workspaceId);
}

export async function getInventoryDailyReports() {
  const context = await requireAuthContext();
  return fetchDailyReportsForWorkspace(context.workspaceId);
}

export async function getInventoryPerformanceData() {
  const context = await requireAuthContext();
  const [products, reports] = await Promise.all([
    fetchProductsForWorkspace(context.workspaceId),
    fetchDailyReportsForWorkspace(context.workspaceId),
  ]);

  const assessment =
    inventoryPerformanceInsightAdapter.computeDeterministicInsights({
      products,
      reports,
    });

  return {
    products,
    reports,
    assessment,
  };
}

export async function getDailyBusinessSummary(
  workspaceId: string,
  dateKey: string,
): Promise<DailyBusinessSummary> {
  const selectedDateKey = normalizeInventoryDateKey(dateKey);
  if (!selectedDateKey) {
    throw new Error("Invalid summary date");
  }

  const dateRange = buildUtcDayRange(selectedDateKey);
  const [products, reports, lookbackRevenueDays] = await Promise.all([
    fetchProductsForWorkspace(workspaceId),
    fetchDailyReportsForWorkspace(workspaceId, dateRange),
    fetchLookbackRevenueRows(workspaceId, dateRange),
  ]);

  return buildDailyBusinessSummary({
    selectedDate: selectedDateKey,
    productCount: products.length,
    reports,
    lookbackRevenueDays,
  });
}

export async function getInventoryDailyBusinessSummary(dateKey: string) {
  const context = await requireAuthContext();
  return getDailyBusinessSummary(context.workspaceId, dateKey);
}

type CreateInventoryProductInput = {
  workspaceId: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  category: string | null;
};

export async function createInventoryProduct({
  workspaceId,
  name,
  sellingPrice,
  costPrice,
  category,
}: CreateInventoryProductInput) {
  return prisma.product.create({
    data: {
      workspace_id: workspaceId,
      name,
      selling_price: sellingPrice,
      cost_price: costPrice,
      category,
      is_active: true,
    },
  });
}

type CreateDailyInventoryReportInput = {
  workspaceId: string;
  productId: string;
  reportDate: Date;
  beginningStock: number;
  stockAdded: number;
  endingStock: number;
  wasteUnits: number;
};

export async function createDailyInventoryReport({
  workspaceId,
  productId,
  reportDate,
  beginningStock,
  stockAdded,
  endingStock,
  wasteUnits,
}: CreateDailyInventoryReportInput) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      workspace_id: workspaceId,
    },
    select: {
      id: true,
      selling_price: true,
      cost_price: true,
      is_active: true,
    },
  });

  if (!product) {
    throw new Error("Selected product is not available in this workspace");
  }
  if (!product.is_active) {
    throw new Error("Selected product is inactive");
  }

  const computed = computeDailyInventoryFinancials({
    beginningStock,
    stockAdded,
    endingStock,
    wasteUnits,
    sellingPrice: Number(product.selling_price),
    costPrice: Number(product.cost_price),
  });

  if (computed.unitsSold < 0) {
    throw new Error(
      "Computed units sold cannot be negative. Check beginning stock, stock added, ending stock, and waste.",
    );
  }

  return prisma.dailyProductReport.create({
    data: {
      workspace_id: workspaceId,
      product_id: product.id,
      report_date: reportDate,
      beginning_stock: beginningStock,
      stock_added: stockAdded,
      ending_stock: endingStock,
      waste_units: wasteUnits,
      units_sold: computed.unitsSold,
      revenue: computed.revenue,
      cogs: computed.cogs,
      gross_profit: computed.grossProfit,
    },
  });
}
