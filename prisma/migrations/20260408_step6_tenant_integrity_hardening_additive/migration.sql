-- Step 6 (additive, non-breaking):
-- - backfill workspace ownership on Venue/Event rows
-- - detach cross-workspace venue links on Event rows
-- - enforce NOT NULL workspace_id on Venue/Event
-- - tighten workspace foreign keys to ON DELETE CASCADE

DO $$
DECLARE
  fallback_workspace_id TEXT;
BEGIN
  SELECT "id"
  INTO fallback_workspace_id
  FROM "Workspace"
  ORDER BY "created_at" ASC, "id" ASC
  LIMIT 1;

  IF fallback_workspace_id IS NULL THEN
    fallback_workspace_id :=
      'ws_backfill_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20);

    INSERT INTO "Workspace" ("id", "name", "timezone", "currency", "created_at", "updated_at")
    VALUES (
      fallback_workspace_id,
      'Signals Workspace',
      'UTC',
      'USD',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;

  UPDATE "Venue"
  SET "workspace_id" = fallback_workspace_id
  WHERE "workspace_id" IS NULL;

  UPDATE "Event" AS e
  SET "workspace_id" = v."workspace_id"
  FROM "Venue" AS v
  WHERE e."workspace_id" IS NULL
    AND e."venue_id" = v."id"
    AND v."workspace_id" IS NOT NULL;

  UPDATE "Event"
  SET "workspace_id" = fallback_workspace_id
  WHERE "workspace_id" IS NULL;

  UPDATE "Event" AS e
  SET "venue_id" = NULL
  FROM "Venue" AS v
  WHERE e."venue_id" = v."id"
    AND e."workspace_id" <> v."workspace_id";
END $$;

ALTER TABLE "Venue"
ALTER COLUMN "workspace_id" SET NOT NULL;

ALTER TABLE "Event"
ALTER COLUMN "workspace_id" SET NOT NULL;

ALTER TABLE "Venue"
DROP CONSTRAINT IF EXISTS "Venue_workspace_id_fkey";

ALTER TABLE "Event"
DROP CONSTRAINT IF EXISTS "Event_workspace_id_fkey";

ALTER TABLE "Venue"
ADD CONSTRAINT "Venue_workspace_id_fkey"
FOREIGN KEY ("workspace_id")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_workspace_id_fkey"
FOREIGN KEY ("workspace_id")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
