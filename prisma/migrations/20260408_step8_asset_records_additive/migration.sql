-- Step 8 (additive, non-breaking):
-- - add workspace-scoped asset records for asset_utilization domain

CREATE TABLE IF NOT EXISTS "AssetRecord" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "asset_name" TEXT NOT NULL,
  "record_date" TIMESTAMP(3) NOT NULL,
  "total_assets" INTEGER NOT NULL DEFAULT 0,
  "booked_assets" INTEGER NOT NULL DEFAULT 0,
  "idle_assets" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssetRecord_workspace_id_record_date_idx"
  ON "AssetRecord"("workspace_id", "record_date");

CREATE INDEX IF NOT EXISTS "AssetRecord_workspace_id_asset_name_record_date_idx"
  ON "AssetRecord"("workspace_id", "asset_name", "record_date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AssetRecord_workspace_id_fkey'
  ) THEN
    ALTER TABLE "AssetRecord"
    ADD CONSTRAINT "AssetRecord_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
