export type Trend = "up" | "down" | "neutral";

export function percentageChange(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

export function toTrend(change: number): Trend {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
}

export function calculateAttendanceComparison(expected: number, actual: number) {
  const variance = actual - expected;
  const rate = expected > 0 ? actual / expected : 0;
  return {
    expected,
    actual,
    variance,
    rate,
  };
}

export function attendanceRate(actualAttendees: number, expectedAttendees: number) {
  if (expectedAttendees <= 0) return 0;
  return actualAttendees / expectedAttendees;
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues: number[], percentileRank: number) {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((sortedValues.length - 1) * percentileRank);
  return sortedValues[index];
}

export function calculateTurnoutRange(actuals: number[]) {
  if (actuals.length === 0) return null;
  const sorted = actuals.slice().sort((a, b) => a - b);

  if (sorted.length >= 6) {
    const lower = percentile(sorted, 0.2);
    const upper = percentile(sorted, 0.8);
    return {
      min: Math.round(lower),
      max: Math.round(upper),
      label: "Typical attendance range (20th-80th percentile)",
    };
  }

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    label: "Attendance range (min-max)",
  };
}
