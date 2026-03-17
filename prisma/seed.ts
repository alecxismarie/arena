import { EventStatus, PrismaClient } from "@prisma/client";
import {
  addDays,
  addMinutes,
  setHours,
  setMinutes,
  startOfDay,
  subDays,
} from "date-fns";

const prisma = new PrismaClient();

const eventNames = [
  "Sunday Championship Showdown",
  "Midnight Derby Finals",
  "Arena Prime Fight Night",
  "Warrior Cup Elimination",
  "Legends of the Cockpit",
  "Rivalry Weekend Main Event",
  "Golden Ring Invitational",
  "Thunder Dome Grand Prix",
  "Ultimate Rooster League",
  "Prime Time Battle Series",
  "Arena Kings Clash",
  "Champions Circuit Night",
  "Victory Bell Championship",
  "Derby of Legends",
  "Nightfall Arena Classic",
  "High Stakes Arena Duel",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitIntoSales(total: number, saleCount: number) {
  const chunks: number[] = [];
  let remaining = total;

  for (let i = 0; i < saleCount - 1; i += 1) {
    const maxChunk = Math.max(1, Math.floor(remaining / (saleCount - i) * 1.8));
    const quantity = randomInt(1, maxChunk);
    chunks.push(quantity);
    remaining -= quantity;
  }

  chunks.push(Math.max(1, remaining));
  return chunks;
}

async function seedEvent({
  name,
  description,
  date,
  venueId,
  capacity,
  ticketPrice,
  status,
  soldRatio,
  attendanceRatio,
}: {
  name: string;
  description: string;
  date: Date;
  venueId: string;
  capacity: number;
  ticketPrice: number;
  status: EventStatus;
  soldRatio: number;
  attendanceRatio: number;
}) {
  const startHour = randomInt(18, 20);
  const startMinute = randomInt(0, 1) * 30;
  const endHour = startHour + randomInt(3, 4);

  const start = setMinutes(setHours(date, startHour), startMinute);
  const end = setMinutes(setHours(date, endHour), startMinute);

  const ticketsSold = Math.floor(capacity * soldRatio);
  const attendanceCount =
    status === "completed" ? Math.floor(ticketsSold * attendanceRatio) : 0;
  const revenue = Number((ticketsSold * ticketPrice).toFixed(2));

  const event = await prisma.event.create({
    data: {
      name,
      description,
      date,
      start_time: start,
      end_time: end,
      venue_id: venueId,
      capacity,
      ticket_price: ticketPrice,
      tickets_sold: ticketsSold,
      attendance_count: attendanceCount,
      revenue,
      status,
    },
  });

  const salesCount = randomInt(8, 18);
  const saleChunks = splitIntoSales(ticketsSold, salesCount);
  const salesRows = saleChunks.map((quantity, index) => {
    const daysBeforeEvent = salesCount - index + randomInt(0, 4);
    const saleDate = subDays(date, daysBeforeEvent);
    return {
      event_id: event.id,
      quantity,
      total_price: Number((quantity * ticketPrice).toFixed(2)),
      created_at: saleDate > new Date() ? new Date() : saleDate,
    };
  });

  await prisma.ticketSale.createMany({
    data: salesRows,
  });

  if (status === "completed" && attendanceCount > 0) {
    const checkIns = Array.from({ length: attendanceCount }, (_, index) => {
      const minuteOffset = randomInt(0, 210);
      return {
        event_id: event.id,
        checkin_time: addMinutes(start, minuteOffset + Math.floor(index / 8)),
      };
    });

    await prisma.attendanceLog.createMany({
      data: checkIns,
    });
  }
}

async function main() {
  await prisma.attendanceLog.deleteMany();
  await prisma.ticketSale.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      name: "Arena Director",
      email: "director@cockpitarena.io",
      role: "admin",
    },
  });

  const venues = await prisma.$transaction([
    prisma.venue.create({
      data: {
        name: "Main Cockpit Arena",
        location: "North District",
        capacity: 1200,
      },
    }),
    prisma.venue.create({
      data: {
        name: "East Wing Pavilion",
        location: "East District",
        capacity: 780,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Ringside Hall",
        location: "Central Strip",
        capacity: 520,
      },
    }),
  ]);

  const today = startOfDay(new Date());

  for (let i = 0; i < 10; i += 1) {
    const venue = venues[i % venues.length];
    const date = subDays(today, randomInt(7, 110));
    await seedEvent({
      name: eventNames[i % eventNames.length],
      description:
        "Past headliner event with premium seating, arena-wide promotion, and sold ticket history.",
      date,
      venueId: venue.id,
      capacity: venue.capacity,
      ticketPrice: randomInt(28, 85),
      status: "completed",
      soldRatio: randomInt(58, 94) / 100,
      attendanceRatio: randomInt(82, 98) / 100,
    });
  }

  for (let i = 10; i < 16; i += 1) {
    const venue = venues[i % venues.length];
    const date = addDays(today, randomInt(3, 70));
    const status: EventStatus = i % 5 === 0 ? "cancelled" : "upcoming";
    await seedEvent({
      name: eventNames[i % eventNames.length],
      description:
        "Upcoming arena feature event with active pre-sale and live scheduling controls.",
      date,
      venueId: venue.id,
      capacity: venue.capacity,
      ticketPrice: randomInt(30, 90),
      status,
      soldRatio: status === "cancelled" ? randomInt(10, 26) / 100 : randomInt(18, 62) / 100,
      attendanceRatio: 0,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
