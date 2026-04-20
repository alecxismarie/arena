"use server";

import { EventStatus } from "@prisma/client";
import { assertCanOperateEvents } from "@/lib/access-control";
import { requireAuthContext } from "@/lib/auth";
import { getCalendarNavCacheTag, getDomainUsageCacheTag } from "@/lib/domain-focus";
import { prisma } from "@/lib/prisma";
import { recomputeWorkspaceDailyAggregates } from "@/lib/workspace-daily-aggregates";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

type EventPayload = {
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  venue_id: string | null;
  capacity: number;
  expected_attendees: number;
  ticket_price: number;
  tickets_sold: number;
  attendance_count: number;
  revenue: number;
  status: EventStatus;
  venue_name: string | null;
};

function parseCalendarDateInput(value: string, field: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid ${field}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error(`Invalid ${field}`);
  }

  return parsed;
}

function parseDateInput(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${field} is required`);
  }

  return parseCalendarDateInput(value, field);
}

function parseTime(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${field} is required`);
  }
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid ${field}`);
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid ${field}`);
  }
  return { hours, minutes };
}

function parseNonNegativeNumber(
  value: FormDataEntryValue | null,
  field: string,
  options?: {
    required?: boolean;
    integer?: boolean;
    defaultValue?: number;
  },
) {
  const { required = true, integer = false, defaultValue = 0 } = options ?? {};
  if (value === null || value === "") {
    if (!required) return defaultValue;
    throw new Error(`${field} is required`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field}`);
  }
  if (parsed < 0) {
    throw new Error(`${field} must be greater than or equal to 0`);
  }
  if (integer && !Number.isInteger(parsed)) {
    throw new Error(`${field} must be a whole number`);
  }

  return parsed;
}

function parseStatus(
  value: FormDataEntryValue | null,
  options?: {
    defaultStatus?: EventStatus;
  },
) {
  const defaultStatus = options?.defaultStatus ?? "upcoming";
  if (value === null || value === "") {
    return defaultStatus;
  }

  if (value === "upcoming" || value === "completed" || value === "cancelled") {
    return value as EventStatus;
  }

  throw new Error("Invalid status");
}

function deriveCanonicalRevenue(ticketsSold: number, ticketPrice: number) {
  // Runtime reporting uses Event-level rollups as canonical values.
  return Number((ticketsSold * ticketPrice).toFixed(2));
}

function revalidateEventDomainCaches(workspaceId: string) {
  revalidateTag(getCalendarNavCacheTag(workspaceId), "max");
  revalidateTag(getDomainUsageCacheTag(workspaceId), "max");
}

function buildEventPayload(
  formData: FormData,
  options: {
    canEditFinancial: boolean;
    existingTicketPrice?: number;
    defaultStatus?: EventStatus;
  },
): EventPayload {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Event name is required");
  }

  const date = parseDateInput(formData.get("date"), "date");
  const start = parseTime(formData.get("start_time"), "start time");
  const end = parseTime(formData.get("end_time"), "end time");

  const start_time = new Date(date);
  start_time.setHours(start.hours, start.minutes, 0, 0);

  const end_time = new Date(date);
  end_time.setHours(end.hours, end.minutes, 0, 0);

  if (start_time >= end_time) {
    throw new Error("End time must be later than start time");
  }

  const capacity = parseNonNegativeNumber(formData.get("capacity"), "capacity", {
    integer: true,
  });
  const expected_attendees = parseNonNegativeNumber(
    formData.get("expected_attendees"),
    "tickets to be sold",
    { integer: true },
  );
  const ticket_price = options.canEditFinancial
    ? parseNonNegativeNumber(formData.get("ticket_price"), "ticket price")
    : options.existingTicketPrice ?? 0;
  const tickets_sold = parseNonNegativeNumber(
    formData.get("tickets_sold"),
    "tickets sold",
    { integer: true, required: false, defaultValue: 0 },
  );
  const actual_attendees = parseNonNegativeNumber(
    formData.get("actual_attendees") ?? formData.get("attendance_count"),
    "actual attendees",
    { integer: true, required: false, defaultValue: 0 },
  );

  if (expected_attendees > capacity) {
    throw new Error("Tickets to be sold cannot exceed capacity");
  }

  if (tickets_sold > capacity) {
    throw new Error("Tickets sold cannot exceed capacity");
  }

  if (actual_attendees > capacity) {
    throw new Error("Actual attendees cannot exceed capacity");
  }

  if (actual_attendees > tickets_sold) {
    throw new Error("Actual attendees cannot exceed tickets sold");
  }

  const revenue = deriveCanonicalRevenue(tickets_sold, ticket_price);
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;
  const venue_name = String(formData.get("venue_name") ?? "").trim() || null;

  return {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    date,
    start_time,
    end_time,
    venue_id,
    capacity,
    expected_attendees,
    ticket_price,
    tickets_sold,
    attendance_count: actual_attendees,
    revenue,
    status: parseStatus(formData.get("status"), {
      defaultStatus: options.defaultStatus,
    }),
    venue_name,
  };
}

async function assertVenueAccessible(
  venueId: string | null,
  workspaceId: string,
) {
  if (!venueId) return;

  const venue = await prisma.venue.findFirst({
    where: {
      id: venueId,
      workspace_id: workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!venue) {
    throw new Error("Venue not found");
  }
}

async function resolveVenueId(params: {
  venueId: string | null;
  venueName: string | null;
  workspaceId: string;
  capacity: number;
}) {
  const venueName = params.venueName?.trim() ?? "";
  if (venueName) {
    const existing = await prisma.venue.findFirst({
      where: {
        workspace_id: params.workspaceId,
        name: {
          equals: venueName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return existing.id;
    }

    const created = await prisma.venue.create({
      data: {
        name: venueName,
        capacity: params.capacity,
        workspace_id: params.workspaceId,
      },
      select: {
        id: true,
      },
    });

    return created.id;
  }

  await assertVenueAccessible(params.venueId, params.workspaceId);
  return params.venueId;
}

export async function createEventAction(formData: FormData) {
  const context = await requireAuthContext();
  assertCanOperateEvents(context);

  const payload = buildEventPayload(formData, {
    canEditFinancial: context.role === "owner",
    defaultStatus: "upcoming",
  });
  const eventData = { ...payload };
  Reflect.deleteProperty(eventData, "venue_name");
  const venueId = await resolveVenueId({
    venueId: payload.venue_id,
    venueName: payload.venue_name,
    workspaceId: context.workspaceId,
    capacity: payload.capacity,
  });

  const created = await prisma.event.create({
    data: {
      ...eventData,
      venue_id: venueId,
      workspace_id: context.workspaceId,
    },
  });

  await recomputeWorkspaceDailyAggregates(context.workspaceId);
  revalidateEventDomainCaches(context.workspaceId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
  redirect(`/events/${created.id}`);
}

export async function updateEventAction(formData: FormData) {
  const context = await requireAuthContext();
  assertCanOperateEvents(context);

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    throw new Error("Event id is required");
  }

  const existingEvent = await prisma.event.findFirst({
    where: {
      id: eventId,
      workspace_id: context.workspaceId,
    },
    select: {
      ticket_price: true,
      status: true,
    },
  });
  if (!existingEvent) {
    throw new Error("Event not found");
  }

  const payload = buildEventPayload(formData, {
    canEditFinancial: context.role === "owner",
    existingTicketPrice: Number(existingEvent.ticket_price),
    defaultStatus: existingEvent.status,
  });
  const eventData = { ...payload };
  Reflect.deleteProperty(eventData, "venue_name");
  const venueId = await resolveVenueId({
    venueId: payload.venue_id,
    venueName: payload.venue_name,
    workspaceId: context.workspaceId,
    capacity: payload.capacity,
  });

  const result = await prisma.event.updateMany({
    where: { id: eventId, workspace_id: context.workspaceId },
    data: {
      ...eventData,
      venue_id: venueId,
    },
  });
  if (result.count === 0) {
    throw new Error("Event not found");
  }

  await recomputeWorkspaceDailyAggregates(context.workspaceId);
  revalidateEventDomainCaches(context.workspaceId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
  redirect(`/events/${eventId}`);
}

export async function rescheduleEventAction(formData: FormData) {
  const context = await requireAuthContext();
  assertCanOperateEvents(context);

  const eventId = String(formData.get("event_id") ?? "");
  const newDateRaw = String(formData.get("new_date") ?? "");
  if (!eventId || !newDateRaw) {
    throw new Error("Event id and new date are required");
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, workspace_id: context.workspaceId },
    select: {
      start_time: true,
      end_time: true,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const nextDate = parseCalendarDateInput(newDateRaw, "new date");

  const nextStart = new Date(nextDate);
  nextStart.setHours(
    event.start_time.getHours(),
    event.start_time.getMinutes(),
    0,
    0,
  );

  const nextEnd = new Date(nextDate);
  nextEnd.setHours(event.end_time.getHours(), event.end_time.getMinutes(), 0, 0);

  const result = await prisma.event.updateMany({
    where: { id: eventId, workspace_id: context.workspaceId },
    data: {
      date: nextDate,
      start_time: nextStart,
      end_time: nextEnd,
      status: "upcoming",
    },
  });
  if (result.count === 0) {
    throw new Error("Event not found");
  }

  await recomputeWorkspaceDailyAggregates(context.workspaceId);
  revalidateEventDomainCaches(context.workspaceId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
}

export async function cancelEventAction(formData: FormData) {
  const context = await requireAuthContext();
  assertCanOperateEvents(context);

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    throw new Error("Event id is required");
  }

  const result = await prisma.event.updateMany({
    where: { id: eventId, workspace_id: context.workspaceId },
    data: {
      status: "cancelled",
    },
  });
  if (result.count === 0) {
    throw new Error("Event not found");
  }

  await recomputeWorkspaceDailyAggregates(context.workspaceId);
  revalidateEventDomainCaches(context.workspaceId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
}
