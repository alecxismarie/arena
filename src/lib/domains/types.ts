export const ANALYSIS_DOMAINS = [
  "event_performance",
  "inventory_performance",
  "asset_utilization",
] as const;

export type AnalysisDomain = (typeof ANALYSIS_DOMAINS)[number];

export const DEFAULT_ANALYSIS_DOMAIN: AnalysisDomain = "event_performance";

export function isAnalysisDomain(value: string): value is AnalysisDomain {
  return ANALYSIS_DOMAINS.includes(value as AnalysisDomain);
}
