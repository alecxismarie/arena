import { EventStatus } from "@prisma/client";

export type EventRecord = {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  start_time: Date;
  end_time: Date;
  status: EventStatus;
  capacity: number;
  expected_attendees: number;
  ticket_price: number;
  tickets_sold: number;
  actual_attendees: number;
  attendance_source: string;
  manual_attendance_notes: string | null;
  revenue: number;
  venue: {
    id: string;
    name: string;
  } | null;
};
