-- Fix predictions UPDATE policy to allow admins to score all predictions
-- This aligns the migration with bootstrap.sql
--
-- Problem: When scoring a match, the admin could only update their own predictions
-- because the RLS policy blocked updates to other users' predictions.
-- This caused points_earned to only be set for the admin's predictions.

DROP POLICY IF EXISTS "Users can update own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can update their own predictions" ON predictions;

CREATE POLICY "Users can update their own predictions"
    ON public.predictions FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
