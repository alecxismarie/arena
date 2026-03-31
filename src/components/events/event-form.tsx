import { EventRecord } from "@/lib/analytics";
import { format } from "date-fns";

type VenueOption = {
  id: string;
  name: string;
  capacity: number;
};

type EventFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  event?: EventRecord;
  venues: VenueOption[];
  submitLabel: string;
  title: string;
  description: string;
};

export function EventForm({
  action,
  event,
  venues,
  submitLabel,
  title,
  description,
}: EventFormProps) {
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
              placeholder="Sunday Championship Fight Night"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Venue</span>
            <select
              defaultValue={event?.venue?.id ?? ""}
              name="venue_id"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            >
              <option value="">Signals Venue</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} ({venue.capacity})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Description</span>
          <textarea
            defaultValue={event?.description ?? ""}
            name="description"
            rows={4}
            placeholder="Headline matchups, special attractions, and expected draw."
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

        <div className="grid gap-4 md:grid-cols-5">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Capacity</span>
            <input
              defaultValue={event?.capacity ?? 600}
              type="number"
              min={0}
              name="capacity"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Expected attendance</span>
            <input
              defaultValue={event?.expected_attendees ?? 0}
              type="number"
              min={0}
              name="expected_attendees"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Ticket price</span>
            <input
              defaultValue={event?.ticket_price ?? 35}
              type="number"
              step="0.01"
              min={0}
              name="ticket_price"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Tickets sold</span>
            <input
              defaultValue={event?.tickets_sold ?? 0}
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
              defaultValue={event?.actual_attendees ?? 0}
              type="number"
              min={0}
              name="actual_attendees"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Status</span>
          <select
            defaultValue={event?.status ?? "upcoming"}
            name="status"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
          >
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
