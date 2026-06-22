-- Deprecate the stored "in_progress" match status.
--
-- "in_progress" is now a derived, display-time state: a match is shown as in-progress
-- once its match_date has passed (see lib/utils/match-status.ts). It is no longer a value
-- that admins set or that we persist. Tighten the CHECK constraint accordingly.

-- Defensively map any pre-existing stored in_progress rows back to scheduled.
-- The display layer will re-derive in_progress from match_date where appropriate.
UPDATE matches SET status = 'scheduled' WHERE status = 'in_progress';

-- Replace the inline CHECK constraint from the initial schema.
ALTER TABLE matches DROP CONSTRAINT matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('scheduled', 'completed', 'cancelled'));
