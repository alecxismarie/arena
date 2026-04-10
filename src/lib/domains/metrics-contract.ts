import { AnalysisDomain } from "@/lib/domains/types";

// Canonical standardized domain metrics contract used to normalize
// deterministic outputs across analysis domains.

export type DomainMetricUnit = "count" | "currency" | "percentage" | "ratio";
export type DomainTrendGranularity = "day" | "week" | "month" | "custom";
export type DomainInsightLevel = "positive" | "warning" | "neutral";
export type DomainMetricMetaValue = string | number | boolean | null;

export type MetricValueItem<TKey extends string = string> = {
  key: TKey;
  label: string;
  value: number;
  unit: DomainMetricUnit;
};

export type RatioMetricItem<TKey extends string = string> = {
  key: TKey;
  label: string;
  value: number;
  numerator: number | null;
  denominator: number | null;
  unit: "percentage" | "ratio";
};

export type TrendSeriesPoint = {
  label: string;
  value: number;
  date: Date | null;
  meta?: Record<string, DomainMetricMetaValue>;
};

export type TrendSeries<TKey extends string = string> = {
  key: TKey;
  label: string;
  granularity: DomainTrendGranularity;
  points: TrendSeriesPoint[];
};

export type RankingMetricItem = {
  id: string;
  label: string;
  value: number;
  meta?: Record<string, DomainMetricMetaValue>;
};

export type InsightMetricItem = {
  key: string;
  level: DomainInsightLevel;
  message: string;
};

export type DomainMetricsPeriodMetadata = {
  from: Date;
  to: Date;
  label: string;
};

export type DomainMetricsMetadata<TDomain extends AnalysisDomain = AnalysisDomain> = {
  domain: TDomain;
  generatedAt: Date;
  period: DomainMetricsPeriodMetadata | null;
  source: {
    mode: "deterministic";
    systems: string[];
    notes?: string[];
  };
  flags?: Record<string, DomainMetricMetaValue>;
};

export type StandardizedDomainMetricsContract<
  TDomain extends AnalysisDomain = AnalysisDomain,
  TTotalKey extends string = string,
  TRatioKey extends string = string,
  TTrendKey extends string = string,
  TRankingKey extends string = string,
> = {
  totals: Partial<Record<TTotalKey, MetricValueItem<TTotalKey>>>;
  ratios: Partial<Record<TRatioKey, RatioMetricItem<TRatioKey>>>;
  trends: Partial<Record<TTrendKey, TrendSeries<TTrendKey>>>;
  rankings: Partial<Record<TRankingKey, RankingMetricItem[]>>;
  insights: InsightMetricItem[];
  metadata: DomainMetricsMetadata<TDomain>;
};
