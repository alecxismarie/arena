import { EventCard } from "@/components/events/event-card";
import { getEvents } from "@/lib/analytics";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Event Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate upcoming shows, update schedules, and review event outcomes.
          </p>
        </div>
        <Link
          href="/events/new"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          New event
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </section>
    </div>
  );
}
