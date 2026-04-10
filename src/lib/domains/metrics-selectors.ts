import { AnalysisDomain } from "@/lib/domains/types";
import {
  InsightMetricItem,
  MetricValueItem,
  RankingMetricItem,
  RatioMetricItem,
  StandardizedDomainMetricsContract,
  TrendSeries,
  TrendSeriesPoint,
} from "@/lib/domains/metrics-contract";

type DomainMetricsContract<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
> = StandardizedDomainMetricsContract<
  TDomain,
  TTotalKey,
  TRatioKey,
  TTrendKey,
  TRankingKey
>;

export function selectTotalMetric<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TTotalKey,
): MetricValueItem<TTotalKey> | null {
  return domainMetrics?.totals[key] ?? null;
}

export function selectTotalValue<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TTotalKey,
  fallback = 0,
): number {
  return selectTotalMetric(domainMetrics, key)?.value ?? fallback;
}

export function selectRatioMetric<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TRatioKey,
): RatioMetricItem<TRatioKey> | null {
  return domainMetrics?.ratios[key] ?? null;
}

export function selectRatioValue<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TRatioKey,
  fallback = 0,
): number {
  return selectRatioMetric(domainMetrics, key)?.value ?? fallback;
}

export function selectTrendSeries<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TTrendKey,
): TrendSeries<TTrendKey> | null {
  return domainMetrics?.trends[key] ?? null;
}

export function selectTrendPoints<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TTrendKey,
): TrendSeriesPoint[] {
  return selectTrendSeries(domainMetrics, key)?.points ?? [];
}

export function selectRanking<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
  key: TRankingKey,
): RankingMetricItem[] {
  return domainMetrics?.rankings[key] ?? [];
}

export function selectInsights<
  TDomain extends AnalysisDomain,
  TTotalKey extends string,
  TRatioKey extends string,
  TTrendKey extends string,
  TRankingKey extends string,
>(
  domainMetrics:
    | DomainMetricsContract<TDomain, TTotalKey, TRatioKey, TTrendKey, TRankingKey>
    | null
    | undefined,
): InsightMetricItem[] {
  return domainMetrics?.insights ?? [];
}
