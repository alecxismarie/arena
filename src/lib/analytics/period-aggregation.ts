import { toNumber } from "@/lib/analytics/event-mapping";
import {
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

export function buildPeriodData(
  rows: Array<{ date: Date; tickets_sold: number; revenue: unknown }>,
  period: "week" | "month",
) {
  const now = new Date();
  const slots =
    period === "week"
      ? eachWeekOfInterval({
          start: startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 }),
          end: now,
        })
      : eachMonthOfInterval({
          start: subMonths(now, 5),
          end: now,
        });

  const map = new Map<string, { tickets: number; revenue: number }>();
  rows.forEach((row) => {
    const key =
      period === "week"
        ? format(startOfWeek(row.date, { weekStartsOn: 1 }), "yyyy-MM-dd")
        : format(row.date, "yyyy-MM");
    const current = map.get(key) ?? { tickets: 0, revenue: 0 };
    map.set(key, {
      tickets: current.tickets + row.tickets_sold,
      revenue: current.revenue + toNumber(row.revenue),
    });
  });

  return slots.map((date) => {
    const key =
      period === "week"
        ? format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
        : format(date, "yyyy-MM");
    const current = map.get(key) ?? { tickets: 0, revenue: 0 };
    return {
      label: period === "week" ? format(date, "MMM d") : format(date, "MMM"),
      tickets: current.tickets,
      revenue: current.revenue,
    };
  });
}
