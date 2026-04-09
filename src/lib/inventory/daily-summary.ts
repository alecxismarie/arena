import {
  DailyBusinessSummary,
  DailyBusinessSummaryMetrics,
  DailyProductReportItem,
  InventoryInsight,
} from "@/lib/inventory/types";

const LOW_STOCK_THRESHOLD = 10;
const HIGH_WASTE_THRESHOLD = 5;
const HEALTHY_MARGIN_THRESHOLD = 0.35;
const MARGIN_PRESSURE_THRESHOLD = 0.2;
const HIGH_WASTE_RATE_THRESHOLD = 0.08;
const STRONG_SALES_MULTIPLIER = 1.15;
const WEAK_SALES_MULTIPLIER = 0.75;

type RevenueDay = {
  dateKey: string;
  revenue: number;
};

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

type ProductAggregate = {
  productId: string;
  productName: string;
  unitsSold: number;
  grossProfit: number;
  wasteUnits: number;
};

function buildMetrics(reports: DailyProductReportItem[]): DailyBusinessSummaryMetrics {
  const finalizedReports = reports.filter((report) => report.is_finalized);

  const totals = finalizedReports.reduce(
    (acc, report) => ({
      unitsSold: acc.unitsSold + report.units_sold,
      recipeBatches:
        acc.recipeBatches + report.units_sold / Math.max(report.product_yield_per_recipe, 1),
      revenue: acc.revenue + report.revenue,
      cogs: acc.cogs + report.cogs,
      grossProfit: acc.grossProfit + report.gross_profit,
    }),
    {
      unitsSold: 0,
      recipeBatches: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
    },
  );

  const byProduct = finalizedReports.reduce((acc, report) => {
    const current = acc.get(report.product_id) ?? {
      productId: report.product_id,
      productName: report.product_name,
      unitsSold: 0,
      grossProfit: 0,
      wasteUnits: 0,
    };
    current.unitsSold += report.units_sold;
    current.grossProfit += report.gross_profit;
    current.wasteUnits += report.waste_units;
    acc.set(report.product_id, current);
    return acc;
  }, new Map<string, ProductAggregate>());

  const aggregates = Array.from(byProduct.values());

  const topSellingProducts = aggregates
    .filter((entry) => entry.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5)
    .map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      value: entry.unitsSold,
    }));

  const topGrossProfitProducts = aggregates
    .filter((entry) => entry.grossProfit > 0)
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 5)
    .map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      value: roundTo(entry.grossProfit, 2),
    }));

  const lowStockProducts = finalizedReports
    .filter((report) => report.ending_stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.ending_stock - b.ending_stock)
    .slice(0, 5)
    .map((report) => ({
      productId: report.product_id,
      productName: report.product_name,
      endingStock: report.ending_stock,
      reportDate: report.report_date,
    }));

  const highWasteProducts = aggregates
    .filter((entry) => entry.wasteUnits >= HIGH_WASTE_THRESHOLD)
    .sort((a, b) => b.wasteUnits - a.wasteUnits)
    .slice(0, 5)
    .map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      wasteUnits: entry.wasteUnits,
    }));

  return {
    reportCount: finalizedReports.length,
    totalUnitsSold: totals.unitsSold,
    totalRecipeBatchesSold: roundTo(totals.recipeBatches, 2),
    totalRevenue: roundTo(totals.revenue, 2),
    totalCogs: roundTo(totals.cogs, 2),
    totalGrossProfit: roundTo(totals.grossProfit, 2),
    grossMarginRate: totals.revenue > 0 ? totals.grossProfit / totals.revenue : null,
    topSellingProducts,
    topGrossProfitProducts,
    lowStockProducts,
    highWasteProducts,
  };
}

function formatRate(value: number | null) {
  if (value === null) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function buildInsights({
  selectedDate,
  productCount,
  metrics,
  lookbackRevenueDays,
  reports,
}: {
  selectedDate: string;
  productCount: number;
  metrics: DailyBusinessSummaryMetrics;
  lookbackRevenueDays: RevenueDay[];
  reports: DailyProductReportItem[];
}): InventoryInsight[] {
  const finalizedReports = reports.filter((report) => report.is_finalized);

  if (productCount === 0) {
    return [
      {
        key: "insufficient_data",
        level: "neutral",
        message: "Add products first to generate the daily business summary.",
      },
    ];
  }

  if (metrics.reportCount === 0) {
    if (reports.length > 0 && finalizedReports.length === 0) {
      return [
        {
          key: "opening_logged_waiting_for_close",
          level: "neutral",
          message:
            "Opening inventory is logged. Submit closing inventory to finalize sales and profit.",
        },
      ];
    }

    return [
      {
        key: "no_reports_submitted",
        level: "neutral",
        message: `No daily reports submitted for ${selectedDate}.`,
      },
    ];
  }

  const insights: InventoryInsight[] = [];

  const baselineDays = lookbackRevenueDays.filter((entry) => entry.dateKey !== selectedDate);
  if (baselineDays.length > 0) {
    const averageRevenue =
      baselineDays.reduce((sum, entry) => sum + entry.revenue, 0) / baselineDays.length;
    if (averageRevenue > 0) {
      if (metrics.totalRevenue >= averageRevenue * STRONG_SALES_MULTIPLIER) {
        insights.push({
          key: "strong_sales_day",
          level: "positive",
          message: "Strong sales day compared with recent revenue baseline.",
        });
      } else if (metrics.totalRevenue <= averageRevenue * WEAK_SALES_MULTIPLIER) {
        insights.push({
          key: "weak_sales_day",
          level: "warning",
          message: "Weak sales day compared with recent revenue baseline.",
        });
      }
    }
  }

  if (metrics.grossMarginRate !== null) {
    if (metrics.grossMarginRate >= HEALTHY_MARGIN_THRESHOLD) {
      insights.push({
        key: "healthy_gross_margin",
        level: "positive",
        message: `Healthy gross margin at ${formatRate(metrics.grossMarginRate)}.`,
      });
    } else if (metrics.grossMarginRate < MARGIN_PRESSURE_THRESHOLD) {
      insights.push({
        key: "margin_pressure",
        level: "warning",
        message: `Margin pressure detected at ${formatRate(metrics.grossMarginRate)}.`,
      });
    }
  }

  const totalWaste = finalizedReports.reduce((sum, report) => sum + report.waste_units, 0);
  const totalAvailable = finalizedReports.reduce(
    (sum, report) => sum + report.beginning_stock + report.stock_added,
    0,
  );
  const wasteRate = totalAvailable > 0 ? totalWaste / totalAvailable : null;
  if (
    metrics.highWasteProducts.length > 0 ||
    (wasteRate !== null && wasteRate >= HIGH_WASTE_RATE_THRESHOLD)
  ) {
    insights.push({
      key: "high_waste_concern",
      level: "warning",
      message: `High waste concern for the day (${formatRate(wasteRate)} waste rate).`,
    });
  }

  if (metrics.lowStockProducts.length > 0) {
    insights.push({
      key: "low_stock_watch",
      level: "warning",
      message: `${metrics.lowStockProducts.length} product(s) are at low-stock risk.`,
    });
  }

  const topProduct = metrics.topSellingProducts[0];
  if (topProduct) {
    insights.push({
      key: "best_performing_product",
      level: "neutral",
      message: `Best-performing product today: ${topProduct.productName}.`,
    });
  }

  if (metrics.totalRecipeBatchesSold > 0) {
    insights.push({
      key: "recipe_batch_equivalent",
      level: "neutral",
      message: `Production equivalent sold: ${metrics.totalRecipeBatchesSold.toFixed(2)} recipe batches.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: "insufficient_data_fallback",
      level: "neutral",
      message: "Insufficient signal depth for this day. Continue daily reporting.",
    });
  }

  return insights;
}

export function buildDailyBusinessSummary({
  selectedDate,
  productCount,
  reports,
  lookbackRevenueDays,
}: {
  selectedDate: string;
  productCount: number;
  reports: DailyProductReportItem[];
  lookbackRevenueDays: RevenueDay[];
}): DailyBusinessSummary {
  const metrics = buildMetrics(reports);
  return {
    selectedDate,
    productCount,
    reports,
    metrics,
    insights: buildInsights({
      selectedDate,
      productCount,
      metrics,
      lookbackRevenueDays,
      reports,
    }),
  };
}
