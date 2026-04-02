-- Step 3 (additive, non-breaking):
-- - add email verification tokens for one-time magic-link onboarding/login

CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "email" TEXT NOT NULL,
  "workspace_name" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_token_hash_key"
  ON "EmailVerificationToken"("token_hash");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_email_created_at_idx"
  ON "EmailVerificationToken"("email", "created_at");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expires_at_idx"
  ON "EmailVerificationToken"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EmailVerificationToken_user_id_fkey'
  ) THEN
    ALTER TABLE "EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_user_id_fkey"
      FOREIGN KEY ("user_id")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
