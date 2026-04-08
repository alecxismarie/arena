export type AssetRecordItem = {
  id: string;
  asset_name: string;
  record_date: Date;
  total_assets: number;
  booked_assets: number;
  idle_assets: number;
  revenue: number | null;
  created_at: Date;
  updated_at: Date;
};

export type AssetUtilizationMetrics = {
  recordCount: number;
  totalAssets: number;
  totalBookedAssets: number;
  totalIdleAssets: number;
  totalRevenue: number;
  utilizationRate: number | null;
  idleRate: number | null;
  revenuePerAsset: number | null;
  lowUtilizationFlag: boolean;
  highUtilizationFlag: boolean;
};

export type AssetInsight = {
  key: string;
  level: "positive" | "warning" | "neutral";
  message: string;
};

export type AssetUtilizationAssessment = {
  insufficientData: boolean;
  metrics: AssetUtilizationMetrics;
  insights: AssetInsight[];
};
