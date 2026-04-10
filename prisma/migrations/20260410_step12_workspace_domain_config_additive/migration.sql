-- Step 12 (additive, non-breaking):
-- - add persisted workspace domain configuration
-- - supports canonical primary_domain + enabled_domains

ALTER TABLE "Workspace"
ADD COLUMN IF NOT EXISTS "primary_domain" TEXT,
ADD COLUMN IF NOT EXISTS "enabled_domains" JSONB;