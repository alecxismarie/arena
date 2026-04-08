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

export const eventPerformanceInsightAdapter: DeterministicInsightAdapter<
  EventPerformanceInsightInput,
  EventIntelligence
> = {
  domain: "event_performance",
  computeDeterministicInsights: ({ currentEvent, historicalRows }) =>
    buildEventIntelligence(currentEvent, historicalRows),
};
