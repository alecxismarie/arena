"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowDownAZ, ArrowUpZA } from "lucide-react";
import { useMemo, useState } from "react";

type EventSummaryRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "completed" | "cancelled";
  tickets_sold: number;
  attendance_count: number;
  revenue: number;
};

type SortKey = "name" | "date" | "status" | "tickets" | "attendance" | "revenue";

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "tickets", label: "Tickets" },
  { key: "attendance", label: "Attendance" },
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
    case "attendance":
      return a.attendance_count - b.attendance_count;
    case "revenue":
      return a.revenue - b.revenue;
  }
}

export function ReportTable({ rows }: { rows: EventSummaryRow[] }) {
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

  return (
    <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.7)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Event Summary Report</h3>
          <p className="text-sm text-muted-foreground">Sortable event performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
          >
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>
                Sort by {option.label}
              </option>
            ))}
          </select>
          <button
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
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
              <th className="px-3 py-2">Attendance</th>
              <th className="px-3 py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="rounded-xl bg-muted/35 text-foreground">
                <td className="rounded-l-xl px-3 py-3 font-medium">{row.name}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {format(new Date(row.date), "MMM d, yyyy")}
                </td>
                <td className="px-3 py-3 capitalize text-muted-foreground">{row.status}</td>
                <td className="px-3 py-3">{formatNumber(row.tickets_sold)}</td>
                <td className="px-3 py-3">{formatNumber(row.attendance_count)}</td>
                <td className="rounded-r-xl px-3 py-3 font-semibold">
                  {formatCurrency(row.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
