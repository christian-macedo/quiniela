-- ============================================================================
-- Restrict Pending Predictions Visibility
-- ============================================================================
-- Migration: 20260617000000_restrict_pending_predictions_visibility
-- Created: 2026-06-17
-- Description: Closes a privacy gap that let any authenticated user read every
--   active user's predictions -- including predictions for matches that have
--   NOT been completed yet (i.e. spying on other players' pending picks).
--
--   New SELECT policy: a user may read a prediction only when at least one of:
--     - it is their own prediction, or
--     - they are an admin, or
--     - the owner is active AND the prediction's match is already 'completed'.
--
--   Safe for existing aggregates:
--     - tournament_rankings (NOT security_invoker) is unaffected by RLS, and
--       pending predictions contribute 0 points anyway, so totals/ranks are
--       unchanged.
--     - tournament_prediction_breakdown and its _previous view (security_invoker)
--       already filter m.status = 'completed', so every row they read remains
--       visible under the new policy.
-- ============================================================================

DROP POLICY IF EXISTS "Active users predictions are viewable" ON public.predictions;

CREATE POLICY "Predictions viewable when own, admin, or match completed"
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
        WHERE m.id = predictions.match_id AND m.status = 'completed'
      )
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
