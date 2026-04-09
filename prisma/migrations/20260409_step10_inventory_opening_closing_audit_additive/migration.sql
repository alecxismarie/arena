-- Step 10 (additive, non-breaking):
-- - add opening/closing audit columns for DailyProductReport
-- - add finalized flag so morning opening counts don't affect daily metrics until close

ALTER TABLE "DailyProductReport"
  ADD COLUMN IF NOT EXISTS "opening_stock_recorded_by" TEXT,
  ADD COLUMN IF NOT EXISTS "opening_stock_recorded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closing_stock_recorded_by" TEXT,
  ADD COLUMN IF NOT EXISTS "closing_stock_recorded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_finalized" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "DailyProductReport_workspace_id_report_date_is_finalized_idx"
  ON "DailyProductReport"("workspace_id", "report_date", "is_finalized");
