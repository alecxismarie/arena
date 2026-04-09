import { DeterministicInsightAdapter } from "@/lib/domains/deterministic-insights";
import {
  DailyProductReportItem,
  InventoryPerformanceAssessment,
  InventoryPerformanceMetrics,
  ProductItem,
} from "@/lib/inventory/types";

type InventoryPerformanceInsightInput = {
  products: ProductItem[];
  reports: DailyProductReportItem[];
};

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sortReportsLatestFirst(
  a: DailyProductReportItem,
  b: DailyProductReportItem,
) {
  const byDate = b.report_date.getTime() - a.report_date.getTime();
  if (byDate !== 0) return byDate;
  return b.updated_at.getTime() - a.updated_at.getTime();
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildMetrics(
  products: ProductItem[],
  reports: DailyProductReportItem[],
): InventoryPerformanceMetrics {
  const totals = reports.reduce(
    (acc, row) => ({
      unitsSold: acc.unitsSold + row.units_sold,
      revenue: acc.revenue + row.revenue,
      cogs: acc.cogs + row.cogs,
      grossProfit: acc.grossProfit + row.gross_profit,
      availableStock: acc.availableStock + row.beginning_stock + row.stock_added,
      wasteUnits: acc.wasteUnits + row.waste_units,
    }),
    {
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      availableStock: 0,
      wasteUnits: 0,
    },
  );

  const productNameById = new Map(products.map((product) => [product.id, product.name]));
  const sortedReports = reports.slice().sort(sortReportsLatestFirst);

  const latestByProduct = new Map<string, DailyProductReportItem>();
  sortedReports.forEach((row) => {
    if (!latestByProduct.has(row.product_id)) {
      latestByProduct.set(row.product_id, row);
    }
  });

  const lowStockProducts = Array.from(latestByProduct.values())
    .filter((row) => row.ending_stock <= 10)
    .map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      endingStock: row.ending_stock,
      reportDate: row.report_date,
    }))
    .sort((a, b) => a.endingStock - b.endingStock)
    .slice(0, 5);

  const aggregateByProduct = reports.reduce(
    (acc, row) => {
      const current = acc.get(row.product_id) ?? {
        productId: row.product_id,
        productName: productNameById.get(row.product_id) ?? row.product_name,
        unitsSold: 0,
        wasteUnits: 0,
        grossProfit: 0,
      };
      current.unitsSold += row.units_sold;
      current.wasteUnits += row.waste_units;
      current.grossProfit += row.gross_profit;
      acc.set(row.product_id, current);
      return acc;
    },
    new Map<
      string,
      {
        productId: string;
        productName: string;
        unitsSold: number;
        wasteUnits: number;
        grossProfit: number;
      }
    >(),
  );

  const aggregateRows = Array.from(aggregateByProduct.values());

  const highWasteProducts = aggregateRows
    .filter((row) => row.wasteUnits >= 5)
    .sort((a, b) => b.wasteUnits - a.wasteUnits)
    .slice(0, 5)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      wasteUnits: row.wasteUnits,
    }));

  const topSellingProducts = aggregateRows
    .filter((row) => row.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      value: row.unitsSold,
    }));

  const topGrossProfitProducts = aggregateRows
    .filter((row) => row.grossProfit > 0)
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 5)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      value: roundTo(row.grossProfit, 2),
    }));

  return {
    productCount: products.length,
    reportCount: reports.length,
    totalUnitsSold: totals.unitsSold,
    totalRevenue: roundTo(totals.revenue, 2),
    totalCogs: roundTo(totals.cogs, 2),
    totalGrossProfit: roundTo(totals.grossProfit, 2),
    grossMarginRate:
      totals.revenue > 0 ? totals.grossProfit / totals.revenue : null,
    averageSellThroughRate:
      totals.availableStock > 0 ? totals.unitsSold / totals.availableStock : null,
    lowStockProductCount: lowStockProducts.length,
    highWasteProductCount: highWasteProducts.length,
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

function buildInsights(
  products: ProductItem[],
  reports: DailyProductReportItem[],
  metrics: InventoryPerformanceMetrics,
) {
  if (products.length === 0 || reports.length === 0) {
    return [
      {
        key: "insufficient_data",
        level: "neutral" as const,
        message: "Add products and daily reports to generate deterministic inventory insights.",
      },
    ];
  }

  const insights: InventoryPerformanceAssessment["insights"] = [];

  const revenueByDay = reports.reduce((acc, row) => {
    const key = dateKey(row.report_date);
    acc.set(key, (acc.get(key) ?? 0) + row.revenue);
    return acc;
  }, new Map<string, number>());
  const dailyKeys = Array.from(revenueByDay.keys()).sort();
  const latestDayKey = dailyKeys[dailyKeys.length - 1];
  const dailyValues = Array.from(revenueByDay.values());
  const averageDayRevenue =
    dailyValues.length > 0
      ? dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length
      : 0;
  const latestDayRevenue = latestDayKey ? revenueByDay.get(latestDayKey) ?? 0 : 0;

  if (averageDayRevenue > 0) {
    if (latestDayRevenue >= averageDayRevenue * 1.15) {
      insights.push({
        key: "strong_sales_day",
        level: "positive",
        message: "Strong sales day detected compared with recent daily revenue.",
      });
    } else if (latestDayRevenue <= averageDayRevenue * 0.75) {
      insights.push({
        key: "weak_sales_day",
        level: "warning",
        message: "Weak sales day detected compared with recent daily revenue.",
      });
    }
  }

  const totalWasteUnits = reports.reduce((sum, row) => sum + row.waste_units, 0);
  const totalAvailableStock = reports.reduce(
    (sum, row) => sum + row.beginning_stock + row.stock_added,
    0,
  );
  const wasteRate =
    totalAvailableStock > 0 ? totalWasteUnits / totalAvailableStock : null;
  if (metrics.highWasteProductCount > 0 || (wasteRate !== null && wasteRate >= 0.08)) {
    insights.push({
      key: "high_waste_concern",
      level: "warning",
      message: `High waste concern: waste rate is ${formatRate(wasteRate)}.`,
    });
  }

  if (metrics.grossMarginRate !== null) {
    if (metrics.grossMarginRate >= 0.35) {
      insights.push({
        key: "healthy_margin",
        level: "positive",
        message: `Healthy gross margin signal at ${formatRate(metrics.grossMarginRate)}.`,
      });
    } else if (metrics.grossMarginRate < 0.2) {
      insights.push({
        key: "low_margin",
        level: "warning",
        message: `Gross margin is thin at ${formatRate(metrics.grossMarginRate)}.`,
      });
    }
  }

  if (metrics.lowStockProductCount > 0) {
    insights.push({
      key: "low_stock_risk",
      level: "warning",
      message: `${metrics.lowStockProductCount} product(s) are at low stock risk.`,
    });
  }

  const topProduct = metrics.topSellingProducts[0];
  if (topProduct) {
    insights.push({
      key: "top_product_signal",
      level: "neutral",
      message: `${topProduct.productName} is the top-selling product by units sold.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: "no_signal",
      level: "neutral",
      message: "No strong inventory performance signal detected yet.",
    });
  }

  return insights;
}

export const inventoryPerformanceInsightAdapter: DeterministicInsightAdapter<
  InventoryPerformanceInsightInput,
  InventoryPerformanceAssessment
> = {
  domain: "inventory_performance",
  computeDeterministicInsights: ({ products, reports }) => {
    const finalizedReports = reports.filter((report) => report.is_finalized);
    const metrics = buildMetrics(products, finalizedReports);
    return {
      insufficientData: products.length === 0 || finalizedReports.length === 0,
      metrics,
      insights: buildInsights(products, finalizedReports, metrics),
    };
  },
};
