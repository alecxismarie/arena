import { createEventAction } from "@/app/actions/event-actions";
import { EventForm } from "@/components/events/event-form";
import { getVenues } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const venues = await getVenues();

  return (
    <EventForm
      action={createEventAction}
      venues={venues}
      submitLabel="Create event"
      title="Create New Event"
      description="Set schedule, pricing, and capacity for a new live venue event."
    />
  );
}
