-- Step 4 (additive, non-breaking):
-- - add password hash to User for returning-password login
-- - add password hash to EmailVerificationToken for first-time verified setup

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

ALTER TABLE "EmailVerificationToken"
ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
