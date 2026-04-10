import { requireAuthContext } from "@/lib/auth";
import {
  getInventoryPerformanceMetrics,
  mapInventoryPerformanceMetricsToLegacyAssessment,
} from "@/lib/domains/inventory-performance-metrics";
import { computeDailyInventoryFinancials } from "@/lib/inventory/computation";
import { buildDailyBusinessSummary } from "@/lib/inventory/daily-summary";
import {
  DailyBusinessSummary,
  DailyProductReportItem,
  ProductItem,
} from "@/lib/inventory/types";
import { prisma } from "@/lib/prisma";

// Canonical runtime inventory analytics source:
// - DailyProductReport (finalized closing records)
//
// Legacy model retained for backward compatibility/deferred cleanup:
// - InventoryRecord (deprecated for runtime reporting paths)
// - Do not add new runtime analytics reads against InventoryRecord.

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
  yield_per_recipe: number;
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
    yield_per_recipe: record.yield_per_recipe,
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
  opening_stock_recorded_by: string | null;
  opening_stock_recorded_at: Date | null;
  stock_added: number;
  ending_stock: number;
  waste_units: number;
  closing_stock_recorded_by: string | null;
  closing_stock_recorded_at: Date | null;
  is_finalized: boolean;
  units_sold: number;
  revenue: unknown;
  cogs: unknown;
  gross_profit: unknown;
  created_at: Date;
  updated_at: Date;
  product: {
    name: string;
    yield_per_recipe: number;
  };
}): DailyProductReportItem {
  return {
    id: record.id,
    product_id: record.product_id,
    product_name: record.product.name,
    product_yield_per_recipe: record.product.yield_per_recipe,
    report_date: record.report_date,
    beginning_stock: record.beginning_stock,
    opening_stock_recorded_by: record.opening_stock_recorded_by,
    opening_stock_recorded_at: record.opening_stock_recorded_at,
    stock_added: record.stock_added,
    ending_stock: record.ending_stock,
    waste_units: record.waste_units,
    closing_stock_recorded_by: record.closing_stock_recorded_by,
    closing_stock_recorded_at: record.closing_stock_recorded_at,
    is_finalized: record.is_finalized,
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
      yield_per_recipe: true,
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
      opening_stock_recorded_by: true,
      opening_stock_recorded_at: true,
      stock_added: true,
      ending_stock: true,
      waste_units: true,
      closing_stock_recorded_by: true,
      closing_stock_recorded_at: true,
      is_finalized: true,
      units_sold: true,
      revenue: true,
      cogs: true,
      gross_profit: true,
      created_at: true,
      updated_at: true,
      product: {
        select: {
          name: true,
          yield_per_recipe: true,
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
      is_finalized: true,
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
  const domainMetricsResult = getInventoryPerformanceMetrics({
    products,
    reports,
  });
  const assessment =
    mapInventoryPerformanceMetricsToLegacyAssessment(domainMetricsResult);

  return {
    products,
    reports,
    assessment,
    // Additive compatibility surface: existing callers can ignore this while
    // standardized inventory contract adoption expands across pages.
    domainMetrics: domainMetricsResult.metrics,
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
  yieldPerRecipe: number;
  category: string | null;
};

export async function createInventoryProduct({
  workspaceId,
  name,
  sellingPrice,
  costPrice,
  yieldPerRecipe,
  category,
}: CreateInventoryProductInput) {
  return prisma.product.create({
    data: {
      workspace_id: workspaceId,
      name,
      selling_price: sellingPrice,
      cost_price: costPrice,
      yield_per_recipe: yieldPerRecipe,
      category,
      is_active: true,
    },
  });
}

type CreateDailyInventoryReportInput = {
  workspaceId: string;
  productId: string;
  reportDate: Date;
  entryStage: "opening" | "closing";
  staffName: string;
  beginningStock?: number;
  stockAdded?: number;
  endingStock?: number;
  wasteUnits?: number;
};

export async function createDailyInventoryReport({
  workspaceId,
  productId,
  reportDate,
  entryStage,
  staffName,
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
  if (entryStage === "opening" && !product.is_active) {
    throw new Error("Selected product is sold out. Mark it active before logging opening stock.");
  }

  const now = new Date();

  if (entryStage === "opening") {
    if (
      beginningStock === undefined ||
      !Number.isInteger(beginningStock) ||
      beginningStock < 0
    ) {
      throw new Error("Beginning stock must be a whole number and at least 0");
    }
    const openingStock: number = beginningStock;

    const existingForDate = await prisma.dailyProductReport.findFirst({
      where: {
        workspace_id: workspaceId,
        product_id: product.id,
        report_date: reportDate,
      },
      select: {
        id: true,
        is_finalized: true,
      },
    });

    if (existingForDate?.is_finalized) {
      throw new Error(
        "Closing inventory is already finalized for this product/date.",
      );
    }

    if (existingForDate) {
      return prisma.dailyProductReport.update({
        where: {
          id: existingForDate.id,
        },
        data: {
          beginning_stock: openingStock,
          opening_stock_recorded_by: staffName,
          opening_stock_recorded_at: now,
          is_finalized: false,
        },
      });
    }

    return prisma.dailyProductReport.create({
      data: {
        workspace_id: workspaceId,
        product_id: product.id,
        report_date: reportDate,
        beginning_stock: openingStock,
        opening_stock_recorded_by: staffName,
        opening_stock_recorded_at: now,
        stock_added: 0,
        ending_stock: openingStock,
        waste_units: 0,
        units_sold: 0,
        revenue: 0,
        cogs: 0,
        gross_profit: 0,
        is_finalized: false,
      },
    });
  }

  const existing = await prisma.dailyProductReport.findFirst({
    where: {
      workspace_id: workspaceId,
      product_id: product.id,
      report_date: reportDate,
    },
    select: {
      id: true,
      beginning_stock: true,
      opening_stock_recorded_at: true,
    },
  });

  if (!existing) {
    throw new Error(
      "Opening inventory is not recorded yet for this product/date. Save opening stock first.",
    );
  }
  if (!existing.opening_stock_recorded_at) {
    throw new Error("Opening inventory timestamp is missing. Save opening stock again.");
  }
  if (stockAdded === undefined || !Number.isInteger(stockAdded) || stockAdded < 0) {
    throw new Error("Stock added must be a whole number and at least 0");
  }
  if (endingStock === undefined || !Number.isInteger(endingStock) || endingStock < 0) {
    throw new Error("Ending stock must be a whole number and at least 0");
  }
  if (wasteUnits === undefined || !Number.isInteger(wasteUnits) || wasteUnits < 0) {
    throw new Error("Waste units must be a whole number and at least 0");
  }
  const closingStockAdded: number = stockAdded;
  const closingEndingStock: number = endingStock;
  const closingWasteUnits: number = wasteUnits;

  const computed = computeDailyInventoryFinancials({
    beginningStock: existing.beginning_stock,
    stockAdded: closingStockAdded,
    endingStock: closingEndingStock,
    wasteUnits: closingWasteUnits,
    sellingPrice: Number(product.selling_price),
    costPrice: Number(product.cost_price),
  });

  if (computed.unitsSold < 0) {
    throw new Error(
      "Computed units sold cannot be negative. Check opening stock, stock added, ending stock, and waste.",
    );
  }

  return prisma.dailyProductReport.update({
    where: {
      id: existing.id,
    },
    data: {
      stock_added: closingStockAdded,
      ending_stock: closingEndingStock,
      waste_units: closingWasteUnits,
      units_sold: computed.unitsSold,
      revenue: computed.revenue,
      cogs: computed.cogs,
      gross_profit: computed.grossProfit,
      closing_stock_recorded_by: staffName,
      closing_stock_recorded_at: now,
      is_finalized: true,
    },
  });
}
