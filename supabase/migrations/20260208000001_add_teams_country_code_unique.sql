-- ============================================================================
-- Add UNIQUE constraint to teams.country_code
-- ============================================================================
-- Migration: 20260208000001
-- Description: Adds UNIQUE constraint to country_code column in teams table
--              This ensures one team per country code and enables ON CONFLICT
--              resolution in seed data inserts.
--
-- Rationale:
-- - Semantically correct: Each country should have one team per country code
-- - Enables ON CONFLICT (country_code) DO NOTHING in seed.sql
-- - Prevents accidental duplicate country codes in production
-- ============================================================================

-- Add UNIQUE constraint to country_code
ALTER TABLE public.teams
ADD CONSTRAINT teams_country_code_unique UNIQUE (country_code);

-- Add comment for documentation
COMMENT ON COLUMN public.teams.country_code IS 'ISO country code (unique per team). Used for team identification and conflict resolution.';
