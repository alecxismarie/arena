"use client";

import { cn, formatDateKeyInTimezone } from "@/lib/utils";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  name: string;
  dayKey: string;
  startTime: string;
  status: "upcoming" | "completed" | "cancelled";
};

const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function statusClass(status: CalendarEvent["status"]) {
  if (status === "completed") {
    return "border-emerald-200/90 bg-emerald-100/70 text-emerald-700";
  }
  if (status === "cancelled") {
    return "border-rose-200/90 bg-rose-100/70 text-rose-700";
  }
  return "border-accent/40 bg-accent/15 text-[color:var(--color-accent-foreground)]";
}

export function CalendarView({
  events,
  timezone,
}: {
  events: CalendarEvent[];
  timezone?: string;
}) {
  const [view, setView] = useState<"month" | "week">("month");
  const [pivotDate, setPivotDate] = useState(new Date());

  const start = useMemo(() => {
    if (view === "week") {
      return startOfWeek(pivotDate, { weekStartsOn: 1 });
    }
    return startOfWeek(startOfMonth(pivotDate), { weekStartsOn: 1 });
  }, [pivotDate, view]);

  const end = useMemo(() => {
    if (view === "week") {
      return endOfWeek(pivotDate, { weekStartsOn: 1 });
    }
    return endOfWeek(endOfMonth(pivotDate), { weekStartsOn: 1 });
  }, [pivotDate, view]);

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = event.dayKey;
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    });
    return map;
  }, [events]);

  const title =
    view === "month" ? format(pivotDate, "MMMM yyyy") : `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">View and manage your event schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
            <button
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                view === "month" ? "btn-primary shadow-sm" : "btn-secondary",
              )}
              onClick={() => setView("month")}
              type="button"
            >
              Month
            </button>
            <button
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                view === "week" ? "btn-primary shadow-sm" : "btn-secondary",
              )}
              onClick={() => setView("week")}
              type="button"
            >
              Week
            </button>
          </div>

          <button
            className="btn-secondary rounded-xl p-2"
            onClick={() =>
              setPivotDate((current) =>
                view === "month" ? subMonths(current, 1) : subWeeks(current, 1),
              )
            }
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="btn-secondary rounded-xl p-2"
            onClick={() =>
              setPivotDate((current) =>
                view === "month" ? addMonths(current, 1) : addWeeks(current, 1),
              )
            }
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            className="btn-secondary rounded-xl px-3 py-2 text-xs font-medium text-foreground"
            onClick={() => setPivotDate(new Date())}
            type="button"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 pb-2">
        {weekday.map((day) => (
          <p key={day} className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {day}
          </p>
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-2",
          view === "month" ? "auto-rows-[150px]" : "auto-rows-[220px]",
        )}
      >
        {days.map((day) => {
          const key = formatDateKeyInTimezone(day, timezone);
          const dayEvents = eventsByDay.get(key) ?? [];
          const mutedMonth =
            view === "month" && day.getMonth() !== pivotDate.getMonth();

          return (
            <div
              key={key}
              className={cn(
                "rounded-2xl border border-border/50 bg-background/75 p-2.5",
                mutedMonth && "opacity-50",
                isToday(day) && "border-accent/60 bg-accent/5",
              )}
            >
              <p
                className={cn(
                  "mb-2 text-sm font-medium",
                  isToday(day) ? "text-accent" : "text-foreground",
                )}
              >
                {format(day, "d")}
              </p>
              <div className="space-y-1.5">
                {dayEvents.slice(0, view === "month" ? 3 : 5).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className={cn(
                      "block rounded-lg border px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-80",
                      statusClass(event.status),
                    )}
                  >
                    <p className="truncate">{event.name}</p>
                    <p className="mt-0.5 text-[11px] opacity-80">{event.startTime}</p>
                  </Link>
                ))}
                {dayEvents.length > (view === "month" ? 3 : 5) ? (
                  <p className="text-[11px] text-muted-foreground">
                    +{dayEvents.length - (view === "month" ? 3 : 5)} more
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-accent/35 bg-accent/15 px-2.5 py-1 text-[color:var(--color-accent-foreground)]">
          Upcoming
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
          Completed
        </span>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
          Cancelled
        </span>
      </div>
    </div>
  );
}
