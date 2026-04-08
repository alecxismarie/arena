-- Step 9 (additive, non-breaking):
-- - add Product and DailyProductReport for inventory daily sales/profit reporting

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "selling_price" DECIMAL(12,2) NOT NULL,
  "cost_price" DECIMAL(12,2) NOT NULL,
  "category" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyProductReport" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "report_date" TIMESTAMP(3) NOT NULL,
  "beginning_stock" INTEGER NOT NULL,
  "stock_added" INTEGER NOT NULL,
  "ending_stock" INTEGER NOT NULL,
  "waste_units" INTEGER NOT NULL DEFAULT 0,
  "units_sold" INTEGER NOT NULL,
  "revenue" DECIMAL(12,2) NOT NULL,
  "cogs" DECIMAL(12,2) NOT NULL,
  "gross_profit" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyProductReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyProductReport_workspace_id_product_id_report_date_key"
  ON "DailyProductReport"("workspace_id", "product_id", "report_date");

CREATE INDEX IF NOT EXISTS "Product_workspace_id_name_idx"
  ON "Product"("workspace_id", "name");

CREATE INDEX IF NOT EXISTS "Product_workspace_id_is_active_idx"
  ON "Product"("workspace_id", "is_active");

CREATE INDEX IF NOT EXISTS "DailyProductReport_workspace_id_report_date_idx"
  ON "DailyProductReport"("workspace_id", "report_date");

CREATE INDEX IF NOT EXISTS "DailyProductReport_workspace_id_product_id_report_date_idx"
  ON "DailyProductReport"("workspace_id", "product_id", "report_date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Product_workspace_id_fkey'
  ) THEN
    ALTER TABLE "Product"
    ADD CONSTRAINT "Product_workspace_id_fkey"
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
    WHERE conname = 'DailyProductReport_workspace_id_fkey'
  ) THEN
    ALTER TABLE "DailyProductReport"
    ADD CONSTRAINT "DailyProductReport_workspace_id_fkey"
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
    WHERE conname = 'DailyProductReport_product_id_fkey'
  ) THEN
    ALTER TABLE "DailyProductReport"
    ADD CONSTRAINT "DailyProductReport_product_id_fkey"
      FOREIGN KEY ("product_id")
      REFERENCES "Product"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
