export type InventoryRecordItem = {
  id: string;
  product_name: string;
  record_date: Date;
  units_in: number;
  units_out: number;
  remaining_stock: number;
  waste_units: number;
  revenue: number | null;
  created_at: Date;
  updated_at: Date;
};

export type InventoryPerformanceMetrics = {
  recordCount: number;
  totalUnitsIn: number;
  totalUnitsOut: number;
  totalWasteUnits: number;
  totalRevenue: number;
  latestRemainingStock: number | null;
  sellThroughRate: number | null;
  wasteRate: number | null;
  revenuePerUnitSold: number | null;
  lowStockRecordCount: number;
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
