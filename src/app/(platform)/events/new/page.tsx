import { createEventAction } from "@/app/actions/event-actions";
import { EventForm } from "@/components/events/event-form";
import { getAuthContext } from "@/lib/auth";
import { getPreferredVenueForNewEvent, getVenues } from "@/lib/analytics";
import { getWorkspaceById } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const [venues, preferredVenue, workspace] = await Promise.all([
    getVenues(),
    getPreferredVenueForNewEvent(),
    getWorkspaceById(context.workspaceId),
  ]);

  return (
    <EventForm
      action={createEventAction}
      venues={venues}
      currency={workspace?.currency}
      role={context.role}
      preferredVenueId={preferredVenue?.id ?? null}
      preferredVenueName={preferredVenue?.name ?? null}
      submitLabel="Create event"
      title="Create event"
      description="Add the core details to start tracking performance."
    />
  );
}

