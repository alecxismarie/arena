-- Step 1 (additive, non-breaking):
-- - add workspace role enum
-- - add membership/session tables
-- - add nullable workspace_id to Venue/Event
-- - add foreign keys and indexes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkspaceRole'
  ) THEN
    CREATE TYPE "WorkspaceRole" AS ENUM ('owner', 'editor');
  END IF;
END $$;

ALTER TABLE "Venue"
ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;

ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;

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

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMembership_workspace_id_user_id_key"
  ON "WorkspaceMembership"("workspace_id", "user_id");

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

CREATE INDEX IF NOT EXISTS "Venue_workspace_id_idx"
  ON "Venue"("workspace_id");

CREATE INDEX IF NOT EXISTS "Event_workspace_id_idx"
  ON "Event"("workspace_id");

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
