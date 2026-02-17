-- Update multiplier column from DECIMAL to INTEGER
-- This migration modifies the existing multiplier column to enforce integer values between 1 and 3

-- First, drop the old constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_multiplier_positive;

-- Update any decimal values to integers (round to nearest integer)
UPDATE matches SET multiplier = ROUND(multiplier);

-- Change column type to INTEGER
ALTER TABLE matches ALTER COLUMN multiplier TYPE INTEGER;

-- Set NOT NULL constraint if not already set
ALTER TABLE matches ALTER COLUMN multiplier SET NOT NULL;

-- Set default to 1 if not already set
ALTER TABLE matches ALTER COLUMN multiplier SET DEFAULT 1;

-- Add new constraint to ensure multiplier is between 1 and 3
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_multiplier_range;
ALTER TABLE matches ADD CONSTRAINT matches_multiplier_range CHECK (multiplier >= 1 AND multiplier <= 3);

-- Update the comment
COMMENT ON COLUMN matches.multiplier IS 'Point multiplier for this match. Final points = base_points * multiplier. Valid values: 1, 2, or 3. Use higher values for playoff/final matches.';
