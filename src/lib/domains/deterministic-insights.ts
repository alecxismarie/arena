import { AnalysisDomain } from "@/lib/domains/types";

export interface DeterministicInsightAdapter<TInput, TOutput> {
  domain: AnalysisDomain;
  computeDeterministicInsights(input: TInput): TOutput;
}
