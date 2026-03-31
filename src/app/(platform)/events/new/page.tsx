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
      title="Create event"
      description="Add the core details to start tracking performance."
    />
  );
}
