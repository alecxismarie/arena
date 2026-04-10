import { assetUtilizationInsightAdapter } from "@/lib/domains/asset-utilization-adapter";
import { eventPerformanceInsightAdapter } from "@/lib/domains/event-performance-adapter";
import { inventoryPerformanceInsightAdapter } from "@/lib/domains/inventory-performance-adapter";
import { AnalysisDomain } from "@/lib/domains/types";

// Canonical deterministic insight adapter registry keyed by AnalysisDomain.
export const deterministicInsightAdapters: Partial<
  Record<AnalysisDomain, unknown>
> = {
  event_performance: eventPerformanceInsightAdapter,
  inventory_performance: inventoryPerformanceInsightAdapter,
  asset_utilization: assetUtilizationInsightAdapter,
};
