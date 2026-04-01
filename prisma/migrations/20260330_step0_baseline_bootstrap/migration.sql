-- Step 0 baseline bootstrap migration (idempotent):
-- Creates the base schema so subsequent additive migrations can run on fresh DBs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'EventStatus'
  ) THEN
    CREATE TYPE "EventStatus" AS ENUM ('upcoming', 'completed', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkspaceRole'
  ) THEN
    CREATE TYPE "WorkspaceRole" AS ENUM ('owner', 'editor');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'manager',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Venue" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "workspace_id" TEXT,
  "capacity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "start_time" TIMESTAMP(3) NOT NULL,
  "end_time" TIMESTAMP(3) NOT NULL,
  "workspace_id" TEXT,
  "venue_id" TEXT,
  "capacity" INTEGER NOT NULL,
  "expected_attendees" INTEGER NOT NULL DEFAULT 0,
  "ticket_price" DECIMAL(10, 2) NOT NULL,
  "tickets_sold" INTEGER NOT NULL DEFAULT 0,
  "attendance_count" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "status" "EventStatus" NOT NULL DEFAULT 'upcoming',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TicketSale" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "total_price" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceLog" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "checkin_time" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'editor',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkspaceDailyAggregate" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "event_count" INTEGER NOT NULL DEFAULT 0,
  "expected_attendees" INTEGER NOT NULL DEFAULT 0,
  "tickets_sold" INTEGER NOT NULL DEFAULT 0,
  "attendance_count" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"
  ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMembership_workspace_id_user_id_key"
  ON "WorkspaceMembership"("workspace_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceDailyAggregate_workspace_id_date_key"
  ON "WorkspaceDailyAggregate"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "Venue_workspace_id_idx"
  ON "Venue"("workspace_id");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_idx"
  ON "Event"("workspace_id");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_date_idx"
  ON "Event"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_status_date_idx"
  ON "Event"("workspace_id", "status", "date");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_created_at_idx"
  ON "Event"("workspace_id", "created_at");

CREATE INDEX IF NOT EXISTS "Event_date_idx"
  ON "Event"("date");

CREATE INDEX IF NOT EXISTS "Event_status_idx"
  ON "Event"("status");

CREATE INDEX IF NOT EXISTS "TicketSale_event_id_created_at_idx"
  ON "TicketSale"("event_id", "created_at");

CREATE INDEX IF NOT EXISTS "AttendanceLog_event_id_checkin_time_idx"
  ON "AttendanceLog"("event_id", "checkin_time");

CREATE INDEX IF NOT EXISTS "WorkspaceMembership_user_id_idx"
  ON "WorkspaceMembership"("user_id");

CREATE INDEX IF NOT EXISTS "WorkspaceMembership_workspace_id_role_idx"
  ON "WorkspaceMembership"("workspace_id", "role");

CREATE INDEX IF NOT EXISTS "Session_user_id_idx"
  ON "Session"("user_id");

CREATE INDEX IF NOT EXISTS "Session_workspace_id_idx"
  ON "Session"("workspace_id");

CREATE INDEX IF NOT EXISTS "Session_expires_at_idx"
  ON "Session"("expires_at");

CREATE INDEX IF NOT EXISTS "WorkspaceDailyAggregate_workspace_id_date_idx"
  ON "WorkspaceDailyAggregate"("workspace_id", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Venue_workspace_id_fkey'
  ) THEN
    ALTER TABLE "Venue"
    ADD CONSTRAINT "Venue_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Event_workspace_id_fkey'
  ) THEN
    ALTER TABLE "Event"
    ADD CONSTRAINT "Event_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Event_venue_id_fkey'
  ) THEN
    ALTER TABLE "Event"
    ADD CONSTRAINT "Event_venue_id_fkey"
      FOREIGN KEY ("venue_id")
      REFERENCES "Venue"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TicketSale_event_id_fkey'
  ) THEN
    ALTER TABLE "TicketSale"
    ADD CONSTRAINT "TicketSale_event_id_fkey"
      FOREIGN KEY ("event_id")
      REFERENCES "Event"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AttendanceLog_event_id_fkey'
  ) THEN
    ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_event_id_fkey"
      FOREIGN KEY ("event_id")
      REFERENCES "Event"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkspaceMembership_workspace_id_fkey'
  ) THEN
    ALTER TABLE "WorkspaceMembership"
    ADD CONSTRAINT "WorkspaceMembership_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkspaceMembership_user_id_fkey'
  ) THEN
    ALTER TABLE "WorkspaceMembership"
    ADD CONSTRAINT "WorkspaceMembership_user_id_fkey"
      FOREIGN KEY ("user_id")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Session_user_id_fkey'
  ) THEN
    ALTER TABLE "Session"
    ADD CONSTRAINT "Session_user_id_fkey"
      FOREIGN KEY ("user_id")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Session_workspace_id_fkey'
  ) THEN
    ALTER TABLE "Session"
    ADD CONSTRAINT "Session_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkspaceDailyAggregate_workspace_id_fkey'
  ) THEN
    ALTER TABLE "WorkspaceDailyAggregate"
    ADD CONSTRAINT "WorkspaceDailyAggregate_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
