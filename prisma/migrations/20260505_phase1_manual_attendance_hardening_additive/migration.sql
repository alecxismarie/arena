-- Phase 1 manual attendance hardening:
-- - keep Event.attendance_count as the canonical attendance rollup
-- - add metadata that makes the current manual source explicit
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "attendance_source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "manual_attendance_notes" TEXT;
