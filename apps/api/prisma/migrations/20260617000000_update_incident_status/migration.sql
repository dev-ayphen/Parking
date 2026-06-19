-- Update IncidentReport status enum and column name
ALTER TABLE "IncidentReport" 
  RENAME COLUMN "resolution" TO "adminNotes";

-- Update existing statuses to new values
UPDATE "IncidentReport" SET status = 'OPEN' WHERE status = 'REPORTED';
UPDATE "IncidentReport" SET status = 'RESOLVED' WHERE status IN ('RESOLVED', 'CLOSED');

-- Add comment explaining the new status values
COMMENT ON COLUMN "IncidentReport".status IS 'OPEN | INVESTIGATING | RESOLVED | REJECTED';
