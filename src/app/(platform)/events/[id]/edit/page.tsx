import { updateEventAction } from "@/app/actions/event-actions";
import { EventForm } from "@/components/events/event-form";
import { getEventById, getVenues } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/workspace";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const { id } = await params;
  const [payload, venues, workspace] = await Promise.all([
    getEventById(id),
    getVenues(),
    getWorkspaceById(context.workspaceId),
  ]);

  if (!payload) {
    notFound();
  }

  const eventForForm =
    context.role === "owner"
      ? payload.event
      : {
          ...payload.event,
          ticket_price: 0,
          revenue: 0,
        };

  return (
    <EventForm
      action={updateEventAction}
      event={eventForForm}
      venues={venues}
      currency={workspace?.currency}
      role={context.role}
      submitLabel="Save changes"
      title="Edit event"
      description="Update schedule and performance inputs."
    />
  );
}

