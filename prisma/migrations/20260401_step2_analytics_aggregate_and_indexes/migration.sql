-- Step 2 (additive, non-breaking):
-- - add workspace daily aggregate table for report precomputation
-- - add event query indexes for workspace/date heavy reads

CREATE TABLE IF NOT EXISTS "WorkspaceDailyAggregate" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "event_count" INTEGER NOT NULL DEFAULT 0,
  "expected_attendees" INTEGER NOT NULL DEFAULT 0,
  "tickets_sold" INTEGER NOT NULL DEFAULT 0,
  "attendance_count" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceDailyAggregate_workspace_id_date_key"
  ON "WorkspaceDailyAggregate"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "WorkspaceDailyAggregate_workspace_id_date_idx"
  ON "WorkspaceDailyAggregate"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_date_idx"
  ON "Event"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_status_date_idx"
  ON "Event"("workspace_id", "status", "date");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_created_at_idx"
  ON "Event"("workspace_id", "created_at");

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
