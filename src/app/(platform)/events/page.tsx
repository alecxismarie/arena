import { EventCard } from "@/components/events/event-card";
import { getEvents } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { getCurrentWorkspace } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const [events, workspace] = await Promise.all([
    getEvents(),
    getCurrentWorkspace(),
  ]);
  const showFinancial = context.role === "owner";

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, update, and review event performance.
          </p>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h2 className="text-lg font-semibold text-foreground">Get started</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Create your first event</li>
            <li>Add expected attendees, ticket price, and status</li>
            <li>Track actual attendance and compare performance</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/events/new"
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Create event
            </Link>
            <Link
              href="/calendar"
              className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              Open calendar
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, update, and review event performance.
          </p>
        </div>
        <Link
          href="/events/new"
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Create event
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            timezone={workspace?.timezone}
            currency={workspace?.currency}
            showFinancial={showFinancial}
          />
        ))}
      </section>
    </div>
  );
}
