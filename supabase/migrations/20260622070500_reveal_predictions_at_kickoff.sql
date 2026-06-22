-- ============================================================================
-- Reveal Predictions At Kickoff
-- ============================================================================
-- Migration: 20260622070500_reveal_predictions_at_kickoff
-- Created: 2026-06-22
-- Description: Predictions now become public to other participants once a match
--   has started, not only once it is "completed". This mirrors the derived
--   "in_progress" display state (a scheduled match whose match_date has passed)
--   and the prediction lock, which both key off match_date — predictions can no
--   longer change after kickoff, so revealing them is safe.
--
--   Updated SELECT policy: a user may read a prediction when at least one of:
--     - it is their own prediction, or
--     - they are an admin, or
--     - the owner is active AND the prediction's match has started
--       (status = 'completed' OR match_date <= now()).
--
--   "in_progress" is intentionally not referenced — it is a derived,
--   display-only state and is never stored (see 20260622065918_tighten_match_status).
--
--   Safe for existing aggregates: tournament_rankings is not security_invoker and
--   pending predictions contribute 0 points; the breakdown views still filter
--   m.status = 'completed', a strict subset of the rows allowed here.
-- ============================================================================

DROP POLICY IF EXISTS "Predictions viewable when own, admin, or match completed" ON public.predictions;

CREATE POLICY "Predictions viewable when own, admin, or match started"
  ON public.predictions FOR SELECT
  USING (
    auth.uid() = predictions.user_id
    OR public.is_admin(auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = predictions.user_id AND users.status = 'active'
      )
      AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = predictions.match_id
          AND (m.status = 'completed' OR m.match_date <= now())
      )
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
