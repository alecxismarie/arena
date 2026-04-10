# Signals Dashboard (Phase 1 MVP)

Signals is an operations intelligence platform spanning event performance, inventory performance, and asset utilization.

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

## Domain Foundation

Canonical domain ids:

- `event_performance`
- `inventory_performance`
- `asset_utilization`

Workspace domain configuration:

- persisted on `Workspace.primary_domain` and `Workspace.enabled_domains`
- if config is absent, runtime falls back to legacy heuristic/default behavior

## Data Models

- `User`
- `Venue`
- `Event`
- `TicketSale` (optional raw event logs)
- `AttendanceLog` (optional raw event logs)
- `Product`
- `DailyProductReport` (canonical runtime inventory reporting source)
- `InventoryRecord` (deprecated legacy inventory table)
- `AssetRecord`

Revenue is modeled as:

`revenue = tickets_sold * ticket_price`

No profit/expense/commission/forecasting features are included in Phase 1.

## Setup

1. Configure PostgreSQL URL in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/arena_db?schema=public"
APP_BASE_URL="http://localhost:3000"
BREVO_API_KEY="your-brevo-api-key"
BREVO_SENDER_EMAIL="no-reply@yourdomain.com"
BREVO_SENDER_NAME="Signals"
NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN="your-cloudflare-beacon-token"
```

2. Generate Prisma client:

```bash
npm run db:generate
```

3. Apply migrations (recommended):

```bash
npm run db:migrate:deploy
```

4. Seed data:

```bash
npm run db:seed
```

5. Start app:

```bash
npm run dev
```

## Vercel Production Auto-Migrations

This project is configured so Vercel uses:

```bash
npm run vercel-build
```

Behavior:

- Production deploy (`VERCEL_ENV=production`): runs `prisma migrate deploy`, then builds.
- Preview/dev deploy: skips migration and only builds.

Requirements:

- Vercel `DATABASE_URL` (Production environment) must point to your production database.

## Migration Baseline Strategy

Signals now includes an idempotent baseline migration (`20260330_step0_baseline_bootstrap`) so fresh databases can apply migrations cleanly.

Use these flows:

1. New empty database:

```bash
npm run db:migrate:deploy
```

2. Existing non-empty database without Prisma migration history (one-time baseline):

```bash
npm run db:migrate:baseline
npm run db:migrate:deploy
```

## Branch Protection

Before live deployment, configure required branch protection checks in GitHub:

- [Branch protection checklist](./docs/branch-protection-checklist.md)

## App Routes

- `/dashboard`
- `/calendar`
- `/events`
- `/events/new`
- `/events/[id]`
- `/events/[id]/edit`
- `/reports`
- `/settings`
