import { EventRecord } from "@/lib/analytics/types";
import {
  attendanceRate,
  average,
  calculateTurnoutRange,
} from "@/lib/analytics/metrics";

export type HistoricalEventRow = {
  id: string;
  name: string;
  date: Date;
  end_time: Date;
  venue_id: string | null;
  expected_attendees: number;
  tickets_sold: number;
  attendance_count: number;
};

type SimilarityMatchStrategy =
  | "venue_day_of_week"
  | "venue_only"
  | "recent_completed";

export type EventIntelligence = {
  insufficientData: boolean;
  message: string;
  sampleSize: number;
  strategy: SimilarityMatchStrategy | "none";
  strategyLabel: string;
  averages: {
    expected_attendees: number;
    actual_attendees: number;
    tickets_sold: number;
    attendance_rate: number;
  } | null;
  turnoutRange: {
    min: number;
    max: number;
    label: string;
  } | null;
  expectedComparison: {
    deltaFromAverage: number;
    position: "above" | "below" | "aligned";
  } | null;
  trend: Array<{
    id: string;
    name: string;
    date: Date;
    expected_attendees: number;
    actual_attendees: number;
    tickets_sold: number;
    attendance_rate: number;
  }>;
};

function pickComparableEvents(
  currentEvent: EventRecord,
  historicalRows: HistoricalEventRow[],
) {
  const minimumComparableSize = 3;
  const currentEventWeekday = currentEvent.date.getDay();

  const sameVenueRows = historicalRows.filter(
    (row) => row.venue_id === (currentEvent.venue?.id ?? null),
  );

  const sameVenueDayRows = sameVenueRows.filter(
    (row) => row.date.getDay() === currentEventWeekday,
  );

  if (sameVenueDayRows.length >= minimumComparableSize) {
    return {
      strategy: "venue_day_of_week" as const,
      strategyLabel: "venue and day of week",
      rows: sameVenueDayRows,
    };
  }

  if (sameVenueRows.length >= minimumComparableSize) {
    return {
      strategy: "venue_only" as const,
      strategyLabel: "venue",
      rows: sameVenueRows,
    };
  }

  return {
    strategy: "recent_completed" as const,
    strategyLabel: "recent completed events",
    rows: historicalRows.slice(0, 12),
  };
}

export function buildEventIntelligence(
  currentEvent: EventRecord,
  historicalRows: HistoricalEventRow[],
): EventIntelligence {
  const picked = pickComparableEvents(currentEvent, historicalRows);
  const comparable = picked.rows.slice(0, 12);

  if (comparable.length < 2) {
    return {
      insufficientData: true,
      message: "Not enough similar event history yet.",
      sampleSize: comparable.length,
      strategy: "none",
      strategyLabel: "insufficient history",
      averages: null,
      turnoutRange: null,
      expectedComparison: null,
      trend: [],
    };
  }

  const comparableRates = comparable.map((row) =>
    attendanceRate(row.attendance_count, row.expected_attendees),
  );
  const averages = {
    expected_attendees: average(comparable.map((row) => row.expected_attendees)),
    actual_attendees: average(comparable.map((row) => row.attendance_count)),
    tickets_sold: average(comparable.map((row) => row.tickets_sold)),
    attendance_rate: average(comparableRates),
  };

  const turnoutRange = calculateTurnoutRange(
    comparable.map((row) => row.attendance_count),
  );

  const expectedDelta = currentEvent.expected_attendees - averages.expected_attendees;
  const expectedComparison =
    Math.abs(expectedDelta) < 1
      ? {
          deltaFromAverage: 0,
          position: "aligned" as const,
        }
      : {
          deltaFromAverage: expectedDelta,
          position: expectedDelta > 0 ? ("above" as const) : ("below" as const),
        };

  const trend = comparable
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row) => ({
      id: row.id,
      name: row.name,
      date: row.date,
      expected_attendees: row.expected_attendees,
      actual_attendees: row.attendance_count,
      tickets_sold: row.tickets_sold,
      attendance_rate: attendanceRate(row.attendance_count, row.expected_attendees),
    }));

  return {
    insufficientData: false,
    message: `Based on ${comparable.length} comparable completed events (${picked.strategyLabel}).`,
    sampleSize: comparable.length,
    strategy: picked.strategy,
    strategyLabel: picked.strategyLabel,
    averages,
    turnoutRange,
    expectedComparison,
    trend,
  };
}
