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
  workspaceId,
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
  workspaceId: string;
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
  const expectedAttendees = Math.floor(capacity * randomInt(50, 95) / 100);
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
      workspace_id: workspaceId,
      venue_id: venueId,
      capacity,
      expected_attendees: expectedAttendees,
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
  await prisma.workspaceInvitationToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.dailyProductReport.deleteMany();
  await prisma.product.deleteMany();
  await prisma.assetRecord.deleteMany();
  await prisma.inventoryRecord.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.ticketSale.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: {
      name: "Signals Workspace",
      timezone: "UTC",
      currency: "USD",
    },
    select: {
      id: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: "Arena Director",
      email: "director@cockpitarena.io",
      role: "admin",
    },
    select: {
      id: true,
    },
  });

  await prisma.workspaceMembership.create({
    data: {
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    },
  });

  const venues = await prisma.$transaction([
    prisma.venue.create({
      data: {
        name: "Main Cockpit Arena",
        location: "North District",
        workspace_id: workspace.id,
        capacity: 1200,
      },
    }),
    prisma.venue.create({
      data: {
        name: "East Wing Pavilion",
        location: "East District",
        workspace_id: workspace.id,
        capacity: 780,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Ringside Hall",
        location: "Central Strip",
        workspace_id: workspace.id,
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
      workspaceId: workspace.id,
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
      workspaceId: workspace.id,
      venueId: venue.id,
      capacity: venue.capacity,
      ticketPrice: randomInt(30, 90),
      status,
      soldRatio: status === "cancelled" ? randomInt(10, 26) / 100 : randomInt(18, 62) / 100,
      attendanceRatio: 0,
    });
  }

  // Deprecated legacy seed data.
  // Canonical runtime inventory reporting uses DailyProductReport.
  // Do not extend runtime inventory features on InventoryRecord.
  await prisma.inventoryRecord.createMany({
    data: [
      {
        workspace_id: workspace.id,
        product_name: "Arena Merch T-Shirt",
        record_date: subDays(today, 5),
        units_in: 120,
        units_out: 88,
        remaining_stock: 30,
        waste_units: 2,
        revenue: Number((88 * 24).toFixed(2)),
      },
      {
        workspace_id: workspace.id,
        product_name: "Arena Merch T-Shirt",
        record_date: subDays(today, 2),
        units_in: 80,
        units_out: 61,
        remaining_stock: 47,
        waste_units: 2,
        revenue: Number((61 * 24).toFixed(2)),
      },
      {
        workspace_id: workspace.id,
        product_name: "Premium Seat Voucher",
        record_date: subDays(today, 4),
        units_in: 60,
        units_out: 43,
        remaining_stock: 16,
        waste_units: 1,
        revenue: Number((43 * 38).toFixed(2)),
      },
      {
        workspace_id: workspace.id,
        product_name: "Drinks Combo",
        record_date: subDays(today, 3),
        units_in: 200,
        units_out: 126,
        remaining_stock: 68,
        waste_units: 6,
        revenue: Number((126 * 9).toFixed(2)),
      },
    ],
  });

  const [coffee, croissant, signatureSandwich, bottledWater] = await prisma.$transaction([
    prisma.product.create({
      data: {
        workspace_id: workspace.id,
        name: "Iced Latte",
        selling_price: 5.8,
        cost_price: 2.15,
        category: "Beverage",
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        workspace_id: workspace.id,
        name: "Butter Croissant",
        selling_price: 3.4,
        cost_price: 1.05,
        category: "Pastry",
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        workspace_id: workspace.id,
        name: "Signature Chicken Sandwich",
        selling_price: 8.9,
        cost_price: 3.75,
        category: "Food",
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        workspace_id: workspace.id,
        name: "Bottled Water",
        selling_price: 2.2,
        cost_price: 0.55,
        category: "Beverage",
        is_active: true,
      },
    }),
  ]);

  const toMoney = (value: number) => Number(value.toFixed(2));
  const createDailyProductReport = (
    product: {
      id: string;
      selling_price: unknown;
      cost_price: unknown;
    },
    reportDate: Date,
    beginningStock: number,
    stockAdded: number,
    endingStock: number,
    wasteUnits = 0,
  ) => {
    const unitsSold = beginningStock + stockAdded - endingStock - wasteUnits;
    const sellingPrice = Number(product.selling_price);
    const costPrice = Number(product.cost_price);
    const revenue = toMoney(unitsSold * sellingPrice);
    const cogs = toMoney(unitsSold * costPrice);
    const grossProfit = toMoney(revenue - cogs);

    return {
      workspace_id: workspace.id,
      product_id: product.id,
      report_date: reportDate,
      beginning_stock: beginningStock,
      stock_added: stockAdded,
      ending_stock: endingStock,
      waste_units: wasteUnits,
      units_sold: unitsSold,
      revenue,
      cogs,
      gross_profit: grossProfit,
    };
  };

  await prisma.dailyProductReport.createMany({
    data: [
      createDailyProductReport(coffee, subDays(today, 2), 40, 20, 18, 2),
      createDailyProductReport(coffee, subDays(today, 1), 38, 24, 17, 1),
      createDailyProductReport(croissant, subDays(today, 2), 30, 20, 11, 3),
      createDailyProductReport(croissant, subDays(today, 1), 28, 16, 10, 2),
      createDailyProductReport(signatureSandwich, subDays(today, 2), 22, 14, 8, 1),
      createDailyProductReport(signatureSandwich, subDays(today, 1), 24, 16, 9, 1),
      createDailyProductReport(bottledWater, subDays(today, 2), 60, 20, 30, 4),
      createDailyProductReport(bottledWater, subDays(today, 1), 50, 20, 28, 3),
    ],
  });

  await prisma.assetRecord.createMany({
    data: [
      {
        workspace_id: workspace.id,
        asset_name: "Main Hall Booths",
        record_date: subDays(today, 5),
        total_assets: 40,
        booked_assets: 31,
        idle_assets: 9,
        revenue: Number((31 * 95).toFixed(2)),
      },
      {
        workspace_id: workspace.id,
        asset_name: "VIP Rooms",
        record_date: subDays(today, 3),
        total_assets: 12,
        booked_assets: 6,
        idle_assets: 6,
        revenue: Number((6 * 280).toFixed(2)),
      },
      {
        workspace_id: workspace.id,
        asset_name: "Portable Lighting Rigs",
        record_date: subDays(today, 2),
        total_assets: 25,
        booked_assets: 21,
        idle_assets: 4,
        revenue: Number((21 * 52).toFixed(2)),
      },
    ],
  });
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
