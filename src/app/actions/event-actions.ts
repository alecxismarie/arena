"use server";

import { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type EventPayload = {
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  venue_id: string | null;
  capacity: number;
  ticket_price: number;
  tickets_sold: number;
  attendance_count: number;
  revenue: number;
  status: EventStatus;
};

function parseDateInput(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${field} is required`);
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field}`);
  }

  return parsed;
}

function parseTime(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${field} is required`);
  }
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid ${field}`);
  }
  return { hours, minutes };
}

function parseNumber(
  value: FormDataEntryValue | null,
  field: string,
  defaultValue = 0,
) {
  if (value === null || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field}`);
  }
  return parsed;
}

function parseStatus(value: FormDataEntryValue | null) {
  if (value === "upcoming" || value === "completed" || value === "cancelled") {
    return value;
  }
  return "upcoming";
}

function buildEventPayload(formData: FormData): EventPayload {
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

  const capacity = parseNumber(formData.get("capacity"), "capacity");
  const ticket_price = parseNumber(formData.get("ticket_price"), "ticket price");
  const tickets_sold = parseNumber(formData.get("tickets_sold"), "tickets sold");
  const attendance_count = parseNumber(
    formData.get("attendance_count"),
    "attendance count",
  );
  const revenue = Number((tickets_sold * ticket_price).toFixed(2));
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;

  return {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    date,
    start_time,
    end_time,
    venue_id,
    capacity,
    ticket_price,
    tickets_sold,
    attendance_count,
    revenue,
    status: parseStatus(formData.get("status")),
  };
}

export async function createEventAction(formData: FormData) {
  const payload = buildEventPayload(formData);
  const created = await prisma.event.create({
    data: payload,
  });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
  redirect(`/events/${created.id}`);
}

export async function updateEventAction(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    throw new Error("Event id is required");
  }

  const payload = buildEventPayload(formData);

  await prisma.event.update({
    where: { id: eventId },
    data: payload,
  });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
  redirect(`/events/${eventId}`);
}

export async function rescheduleEventAction(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const newDateRaw = String(formData.get("new_date") ?? "");
  if (!eventId || !newDateRaw) {
    throw new Error("Event id and new date are required");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      start_time: true,
      end_time: true,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const nextDate = new Date(`${newDateRaw}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) {
    throw new Error("Invalid new date");
  }

  const nextStart = new Date(nextDate);
  nextStart.setHours(
    event.start_time.getHours(),
    event.start_time.getMinutes(),
    0,
    0,
  );

  const nextEnd = new Date(nextDate);
  nextEnd.setHours(event.end_time.getHours(), event.end_time.getMinutes(), 0, 0);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      date: nextDate,
      start_time: nextStart,
      end_time: nextEnd,
      status: "upcoming",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
}

export async function cancelEventAction(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    throw new Error("Event id is required");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "cancelled",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
}
