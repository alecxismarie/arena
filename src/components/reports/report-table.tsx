"use client";

import { BrandSelect } from "@/components/ui/brand-select";
import { formatCurrency, formatInTimezone, formatNumber } from "@/lib/utils";
import { ArrowDownAZ, ArrowUpZA } from "lucide-react";
import { useMemo, useState } from "react";

type EventSummaryRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "completed" | "cancelled";
  expected_attendees: number;
  tickets_sold: number;
  actual_attendees: number;
  attendance_variance: number;
  attendance_rate: number;
  revenue?: number;
};

type SortKey =
  | "name"
  | "date"
  | "status"
  | "tickets"
  | "expected"
  | "actual"
  | "variance"
  | "rate"
  | "revenue";

const baseSortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "tickets", label: "Tickets" },
  { key: "expected", label: "Expected" },
  { key: "actual", label: "Actual" },
  { key: "variance", label: "Variance" },
  { key: "rate", label: "Rate" },
  { key: "revenue", label: "Revenue" },
];

function compareRows(a: EventSummaryRow, b: EventSummaryRow, key: SortKey) {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "date":
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    case "status":
      return a.status.localeCompare(b.status);
    case "tickets":
      return a.tickets_sold - b.tickets_sold;
    case "expected":
      return a.expected_attendees - b.expected_attendees;
    case "actual":
      return a.actual_attendees - b.actual_attendees;
    case "variance":
      return a.attendance_variance - b.attendance_variance;
    case "rate":
      return a.attendance_rate - b.attendance_rate;
    case "revenue":
      return (a.revenue ?? 0) - (b.revenue ?? 0);
  }
}

export function ReportTable({
  rows,
  showRevenue = true,
  currency,
  timezone,
}: {
  rows: EventSummaryRow[];
  showRevenue?: boolean;
  currency?: string;
  timezone?: string;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    const cloned = rows.slice();
    cloned.sort((a, b) => {
      const result = compareRows(a, b, sortBy);
      return direction === "asc" ? result : result * -1;
    });
    return cloned;
  }, [direction, rows, sortBy]);

  const sortOptions = useMemo(
    () =>
      baseSortOptions
        .filter((option) => showRevenue || option.key !== "revenue")
        .map((option) => ({
          value: option.key,
          label: `Sort by ${option.label}`,
        })),
    [showRevenue],
  );

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Event Performance Table</h3>
          <p className="text-sm text-muted-foreground">Sortable performance view across events.</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandSelect
            name="report_sort_by"
            value={sortBy}
            onChange={(value) => setSortBy(value as SortKey)}
            options={sortOptions}
            className="min-w-[170px] text-sm"
          />
          <button
            className="btn-secondary inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium"
            onClick={() => setDirection((current) => (current === "asc" ? "desc" : "asc"))}
            type="button"
          >
            {direction === "asc" ? (
              <>
                <ArrowDownAZ className="h-4 w-4" />
                Asc
              </>
            ) : (
              <>
                <ArrowUpZA className="h-4 w-4" />
                Desc
              </>
            )}
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tickets</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2">Variance</th>
              <th className="px-3 py-2">Rate</th>
              {showRevenue ? <th className="px-3 py-2">Revenue</th> : null}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="rounded-xl bg-background/70 text-foreground shadow-[0_1px_0_rgba(31,23,17,0.04)]">
                <td className="rounded-l-xl px-3 py-3 font-medium">{row.name}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {formatInTimezone(row.date, timezone, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-3 capitalize text-muted-foreground">{row.status}</td>
                <td className="px-3 py-3">{formatNumber(row.tickets_sold)}</td>
                <td className="px-3 py-3">{formatNumber(row.expected_attendees)}</td>
                <td className="px-3 py-3">{formatNumber(row.actual_attendees)}</td>
                <td className="px-3 py-3">{formatNumber(row.attendance_variance)}</td>
                <td className="px-3 py-3">{(row.attendance_rate * 100).toFixed(1)}%</td>
                {showRevenue ? (
                  <td className="rounded-r-xl px-3 py-3 font-semibold">
                    {formatCurrency(row.revenue ?? 0, currency)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
