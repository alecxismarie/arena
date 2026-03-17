import { updateEventAction } from "@/app/actions/event-actions";
import { EventForm } from "@/components/events/event-form";
import { getEventById, getVenues } from "@/lib/analytics";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [payload, venues] = await Promise.all([getEventById(id), getVenues()]);

  if (!payload) {
    notFound();
  }

  return (
    <EventForm
      action={updateEventAction}
      event={payload.event}
      venues={venues}
      submitLabel="Save changes"
      title="Edit Event"
      description="Update event schedule, attendance, and sales tracking fields."
    />
  );
}
