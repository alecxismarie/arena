-- Step 7 (additive, non-breaking):
-- - add workspace-scoped inventory records for inventory_performance domain

CREATE TABLE IF NOT EXISTS "InventoryRecord" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "record_date" TIMESTAMP(3) NOT NULL,
  "units_in" INTEGER NOT NULL DEFAULT 0,
  "units_out" INTEGER NOT NULL DEFAULT 0,
  "remaining_stock" INTEGER NOT NULL DEFAULT 0,
  "waste_units" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryRecord_workspace_id_record_date_idx"
  ON "InventoryRecord"("workspace_id", "record_date");

CREATE INDEX IF NOT EXISTS "InventoryRecord_workspace_id_product_name_record_date_idx"
  ON "InventoryRecord"("workspace_id", "product_name", "record_date");

CREATE INDEX IF NOT EXISTS "InventoryRecord_record_date_idx"
  ON "InventoryRecord"("record_date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryRecord_workspace_id_fkey'
  ) THEN
    ALTER TABLE "InventoryRecord"
    ADD CONSTRAINT "InventoryRecord_workspace_id_fkey"
      FOREIGN KEY ("workspace_id")
      REFERENCES "Workspace"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
