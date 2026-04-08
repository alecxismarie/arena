export type ProductItem = {
  id: string;
  name: string;
  selling_price: number;
  cost_price: number;
  category: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type DailyProductReportItem = {
  id: string;
  product_id: string;
  product_name: string;
  report_date: Date;
  beginning_stock: number;
  stock_added: number;
  ending_stock: number;
  waste_units: number;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  created_at: Date;
  updated_at: Date;
};

export type InventoryLeaderboardEntry = {
  productId: string;
  productName: string;
  value: number;
};

export type LowStockEntry = {
  productId: string;
  productName: string;
  endingStock: number;
  reportDate: Date;
};

export type HighWasteEntry = {
  productId: string;
  productName: string;
  wasteUnits: number;
};

export type InventoryPerformanceMetrics = {
  productCount: number;
  reportCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCogs: number;
  totalGrossProfit: number;
  grossMarginRate: number | null;
  averageSellThroughRate: number | null;
  lowStockProductCount: number;
  highWasteProductCount: number;
  topSellingProducts: InventoryLeaderboardEntry[];
  topGrossProfitProducts: InventoryLeaderboardEntry[];
  lowStockProducts: LowStockEntry[];
  highWasteProducts: HighWasteEntry[];
};

export type InventoryInsight = {
  key: string;
  level: "positive" | "warning" | "neutral";
  message: string;
};

export type InventoryPerformanceAssessment = {
  insufficientData: boolean;
  metrics: InventoryPerformanceMetrics;
  insights: InventoryInsight[];
};

export type DailyBusinessSummaryMetrics = {
  reportCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCogs: number;
  totalGrossProfit: number;
  grossMarginRate: number | null;
  topSellingProducts: InventoryLeaderboardEntry[];
  topGrossProfitProducts: InventoryLeaderboardEntry[];
  lowStockProducts: LowStockEntry[];
  highWasteProducts: HighWasteEntry[];
};

export type DailyBusinessSummary = {
  selectedDate: string;
  productCount: number;
  reports: DailyProductReportItem[];
  metrics: DailyBusinessSummaryMetrics;
  insights: InventoryInsight[];
};
