-- ============================================================================
-- Fix Predictions RLS Policies (Issue #39)
-- ============================================================================
-- Migration: fix_predictions_rls_policies
-- Created: 2026-04-11
-- Description: Addresses three security gaps in predictions:
--   6a: Hide deactivated users' predictions from SELECT
--   6b: Enforce tournament participation in INSERT/UPDATE RLS
-- ============================================================================

-- 6a: Restrict SELECT to only show predictions from active users
DROP POLICY IF EXISTS "Predictions are viewable by everyone" ON public.predictions;
CREATE POLICY "Active users predictions are viewable"
  ON public.predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = predictions.user_id AND users.status = 'active'
    )
  );

-- 6b: Add tournament participation check to INSERT policy
DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;
CREATE POLICY "Users can insert their own predictions"
  ON public.predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.tournament_participants tp
        ON tp.tournament_id = m.tournament_id AND tp.user_id = auth.uid()
      WHERE m.id = match_id
    )
  );

-- 6b: Add tournament participation check to UPDATE policy (preserve admin bypass)
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.predictions;
CREATE POLICY "Users can update their own predictions"
  ON public.predictions FOR UPDATE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND status = 'active'
      )
      AND EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.tournament_participants tp
          ON tp.tournament_id = m.tournament_id AND tp.user_id = auth.uid()
        WHERE m.id = match_id
      )
    )
    OR public.is_admin(auth.uid())
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
