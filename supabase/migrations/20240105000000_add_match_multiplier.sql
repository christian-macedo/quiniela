-- Add multiplier field to matches table to allow matches to be worth more points
-- Default multiplier is 1, but can be set higher for important matches (e.g., finals, semifinals)
-- Valid values: 1, 2, or 3 (integers only)

-- Note: If this migration fails because the column already exists,
-- run migration 20240106000000_update_multiplier_to_integer.sql instead

ALTER TABLE matches ADD COLUMN IF NOT EXISTS multiplier INTEGER NOT NULL DEFAULT 1;

-- Add a check constraint to ensure multiplier is between 1 and 3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_multiplier_range'
  ) THEN
    ALTER TABLE matches ADD CONSTRAINT matches_multiplier_range CHECK (multiplier >= 1 AND multiplier <= 3);
  END IF;
END $$;

-- Add a comment to document the field
COMMENT ON COLUMN matches.multiplier IS 'Point multiplier for this match. Final points = base_points * multiplier. Valid values: 1, 2, or 3. Use higher values for playoff/final matches.';
