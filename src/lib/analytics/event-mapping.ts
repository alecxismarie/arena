import { EventStatus } from "@prisma/client";
import { EventRecord } from "@/lib/analytics/types";

export type EventWithVenue = {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  status: EventStatus;
  capacity: number;
  expected_attendees: number;
  ticket_price: unknown;
  tickets_sold: number;
  attendance_count: number;
  revenue: unknown;
  venue?: {
    id: string;
    name: string;
  } | null;
};

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function normalizeEventStatus(
  endTime: Date,
  status: EventStatus,
): EventStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (endTime < new Date()) return "completed";
  return "upcoming";
}

export function mapEventRecord(event: EventWithVenue): EventRecord {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date,
    start_time: event.start_time,
    end_time: event.end_time,
    status: normalizeEventStatus(event.end_time, event.status),
    capacity: event.capacity,
    expected_attendees: event.expected_attendees,
    ticket_price: toNumber(event.ticket_price),
    tickets_sold: event.tickets_sold,
    actual_attendees: event.attendance_count,
    revenue: toNumber(event.revenue),
    venue: event.venue
      ? {
          id: event.venue.id,
          name: event.venue.name,
        }
      : null,
  };
}
