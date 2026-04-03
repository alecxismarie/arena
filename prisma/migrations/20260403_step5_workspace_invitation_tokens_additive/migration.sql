-- Step 5 (additive, non-breaking):
-- - add workspace invitation tokens for email-based team invites

CREATE TABLE IF NOT EXISTS "WorkspaceInvitationToken" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "invited_by_user_id" TEXT NOT NULL,
  "invited_email" TEXT NOT NULL,
  "invited_name" TEXT NOT NULL,
  "invited_role" "WorkspaceRole" NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceInvitationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvitationToken_token_hash_key"
  ON "WorkspaceInvitationToken"("token_hash");

CREATE INDEX IF NOT EXISTS "WorkspaceInvitationToken_workspace_id_invited_email_created_at_idx"
  ON "WorkspaceInvitationToken"("workspace_id", "invited_email", "created_at");

CREATE INDEX IF NOT EXISTS "WorkspaceInvitationToken_expires_at_idx"
  ON "WorkspaceInvitationToken"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkspaceInvitationToken_workspace_id_fkey'
  ) THEN
    ALTER TABLE "WorkspaceInvitationToken"
    ADD CONSTRAINT "WorkspaceInvitationToken_workspace_id_fkey"
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
    WHERE conname = 'WorkspaceInvitationToken_invited_by_user_id_fkey'
  ) THEN
    ALTER TABLE "WorkspaceInvitationToken"
    ADD CONSTRAINT "WorkspaceInvitationToken_invited_by_user_id_fkey"
      FOREIGN KEY ("invited_by_user_id")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
