"use client";

import { EventRecord } from "@/lib/analytics";
import { BrandSelect } from "@/components/ui/brand-select";
import { resolveWorkspaceCurrency } from "@/lib/workspace-options";
import { format } from "date-fns";
import { useMemo, useState } from "react";

type VenueOption = {
  id: string;
  name: string;
  capacity: number;
};

type EventFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  event?: EventRecord;
  venues: VenueOption[];
  currency?: string | null;
  role: "owner" | "editor";
  preferredVenueId?: string | null;
  preferredVenueName?: string | null;
  submitLabel: string;
  title: string;
  description: string;
};

export function EventForm({
  action,
  event,
  venues,
  currency,
  role,
  preferredVenueId,
  preferredVenueName,
  submitLabel,
  title,
  description,
}: EventFormProps) {
  const isCreateMode = !event;
  const shouldUseVenueSelect = !isCreateMode || venues.length > 1;
  const canViewFinancial = role === "owner";
  const metricsGridClass =
    isCreateMode && canViewFinancial
      ? "grid gap-4 md:grid-cols-3 lg:grid-cols-5"
      : isCreateMode && !canViewFinancial
        ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        : !isCreateMode && canViewFinancial
          ? "grid gap-4 md:grid-cols-4 lg:grid-cols-7"
          : "grid gap-4 md:grid-cols-3 lg:grid-cols-5";
  const [capacityInput, setCapacityInput] = useState(
    event ? String(event.capacity) : "",
  );
  const [expectedAttendeesInput, setExpectedAttendeesInput] = useState(
    event ? String(event.expected_attendees) : "",
  );
  const [ticketPriceInput, setTicketPriceInput] = useState(
    event ? String(event.ticket_price) : "",
  );
  const initialVenueId = event?.venue?.id ?? preferredVenueId ?? "";
  const initialVenueName = event?.venue?.name ?? preferredVenueName ?? "";
  const venueOptions = [
    { value: "", label: "No venue selected" },
    ...venues.map((venue) => ({
      value: venue.id,
      label: `${venue.name} (${venue.capacity})`,
    })),
  ];
  const statusOptions = [
    { value: "upcoming", label: "Upcoming" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const expectedSalesDisplay = useMemo(() => {
    if (!canViewFinancial) return "";
    const capacity = Number(capacityInput);
    const expectedAttendees = Number(expectedAttendeesInput);
    const ticketPrice = Number(ticketPriceInput);

    const projectedTickets = expectedAttendees > 0 ? expectedAttendees : capacity;

    if (!Number.isFinite(projectedTickets) || !Number.isFinite(ticketPrice)) {
      return "";
    }
    if (projectedTickets <= 0 || ticketPrice <= 0) {
      return "";
    }

    const projectedSales = projectedTickets * ticketPrice;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolveWorkspaceCurrency(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(projectedSales);
  }, [canViewFinancial, capacityInput, currency, expectedAttendeesInput, ticketPriceInput]);

  return (
    <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>

      <form action={action} className="space-y-5">
        {event ? <input type="hidden" name="event_id" value={event.id} /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Event name</span>
            <input
              defaultValue={event?.name}
              name="name"
              placeholder="Enter event name"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Venue</span>
            {shouldUseVenueSelect ? (
              <BrandSelect
                name="venue_id"
                defaultValue={initialVenueId}
                options={venueOptions}
                placeholder="Select venue"
                emptyMessage="No venues available yet"
              />
            ) : (
              <input
                name="venue_name"
                defaultValue={initialVenueName}
                placeholder="Enter venue"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            )}
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Description</span>
          <textarea
            defaultValue={event?.description ?? ""}
            name="description"
            rows={4}
            placeholder="Add event description"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Event date</span>
            <input
              defaultValue={event ? format(event.date, "yyyy-MM-dd") : ""}
              type="date"
              name="date"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Start time</span>
            <input
              defaultValue={event ? format(event.start_time, "HH:mm") : ""}
              type="time"
              name="start_time"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">End time</span>
            <input
              defaultValue={event ? format(event.end_time, "HH:mm") : ""}
              type="time"
              name="end_time"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>
        </div>

        <div className={metricsGridClass}>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Capacity</span>
            <input
              value={capacityInput}
              onChange={(event) => setCapacityInput(event.target.value)}
              type="number"
              min={0}
              name="capacity"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Tickets to be sold</span>
            <input
              value={expectedAttendeesInput}
              onChange={(event) => setExpectedAttendeesInput(event.target.value)}
              type="number"
              min={0}
              name="expected_attendees"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          {canViewFinancial ? (
            <>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Ticket price</span>
                <input
                  value={ticketPriceInput}
                  onChange={(event) => setTicketPriceInput(event.target.value)}
                  type="number"
                  step="0.01"
                  min={0}
                  name="ticket_price"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Expected sales</span>
                <input
                  value={expectedSalesDisplay}
                  readOnly
                  placeholder="Auto-calculated"
                  className="w-full rounded-xl border border-border bg-muted/35 px-3 py-2.5 text-foreground outline-none"
                />
              </label>
            </>
          ) : null}

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Status</span>
            <BrandSelect
              name="status"
              defaultValue={event?.status ?? ""}
              options={statusOptions}
              placeholder="Select status"
            />
          </label>

          {event ? (
            <>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Tickets sold</span>
                <input
                  defaultValue={event.tickets_sold}
                  type="number"
                  min={0}
                  name="tickets_sold"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Actual attendance</span>
                <input
                  defaultValue={event.actual_attendees}
                  type="number"
                  min={0}
                  name="actual_attendees"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="pt-1">
          <button
            type="submit"
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
