# Cockpit Arena Analytics Dashboard (Phase 1 MVP)

Premium SaaS-style analytics dashboard for managing cockpit arena / live venue events.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Recharts
- date-fns
- lucide-react

## Phase 1 Included

- Analytics dashboard (stat cards + charts)
- Event calendar (month/week)
- Event management (create, edit, reschedule, cancel, detail views)
- Reports (weekly sales, monthly sales, attendance, revenue, event summary)
- Seeded realistic events + ticket sales + attendance logs

## Data Models

- `User`
- `Venue`
- `Event`
- `TicketSale`
- `AttendanceLog`

Revenue is modeled as:

`revenue = tickets_sold * ticket_price`

No profit/expense/commission/forecasting features are included in Phase 1.

## Setup

1. Configure PostgreSQL URL in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/arena_db?schema=public"
```

2. Generate Prisma client:

```bash
npm run db:generate
```

3. Push schema:

```bash
npm run db:push
```

4. Seed data:

```bash
npm run db:seed
```

5. Start app:

```bash
npm run dev
```

## App Routes

- `/dashboard`
- `/calendar`
- `/events`
- `/events/new`
- `/events/[id]`
- `/events/[id]/edit`
- `/reports`
- `/settings`
