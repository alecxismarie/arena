import {
  buildEventIntelligence,
  EventIntelligence,
  HistoricalEventRow,
} from "@/lib/analytics/event-intelligence";
import { EventRecord } from "@/lib/analytics/types";
import { DeterministicInsightAdapter } from "@/lib/domains/deterministic-insights";

type EventPerformanceInsightInput = {
  currentEvent: EventRecord;
  historicalRows: HistoricalEventRow[];
};

// Event deterministic intelligence adapter retained for compatibility.
// Phase 2A standardized metrics are implemented in
// src/lib/domains/event-performance-metrics.ts and wrap this adapter for detail insights.
export const eventPerformanceInsightAdapter: DeterministicInsightAdapter<
  EventPerformanceInsightInput,
  EventIntelligence
> = {
  domain: "event_performance",
  computeDeterministicInsights: ({ currentEvent, historicalRows }) =>
    buildEventIntelligence(currentEvent, historicalRows),
};
