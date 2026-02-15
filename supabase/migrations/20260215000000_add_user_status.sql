-- ============================================================================
-- Add User Status Column for Soft Delete
-- ============================================================================
-- Migration: 20260215000000_add_user_status
-- Created: 2026-02-15
-- Description: Adds status column to users table to support account deactivation
--              and updates tournament_rankings view to exclude deactivated users.
--              Also updates RLS policies to block deactivated users from predictions.
-- ============================================================================

-- Add status column to users table
ALTER TABLE public.users
ADD COLUMN status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'deactivated'));

-- Set all existing users to active
UPDATE public.users SET status = 'active' WHERE status IS NULL;

-- Add partial index for performance (only indexes deactivated users)
CREATE INDEX idx_users_status ON public.users(status)
WHERE status = 'deactivated';

-- Update tournament_rankings VIEW to exclude deactivated users
CREATE OR REPLACE VIEW public.tournament_rankings
WITH (security_invoker = true) AS
SELECT
    p.user_id,
    m.tournament_id,
    u.screen_name,
    u.avatar_url,
    COUNT(DISTINCT p.id) AS predictions_count,
    COALESCE(SUM(p.points_earned), 0) AS total_points,
    RANK() OVER (
        PARTITION BY m.tournament_id
        ORDER BY COALESCE(SUM(p.points_earned), 0) DESC
    ) AS rank
FROM public.predictions p
JOIN public.matches m ON p.match_id = m.id
JOIN public.users u ON p.user_id = u.id
JOIN public.tournament_participants tp
    ON tp.tournament_id = m.tournament_id
    AND tp.user_id = p.user_id
WHERE u.status = 'active'  -- NEW: Filter deactivated users
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url;

-- Update RLS policies to block deactivated users from inserting predictions
DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;
CREATE POLICY "Users can insert their own predictions"
    ON public.predictions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND status = 'active'
        )
    );

-- Update RLS policies to block deactivated users from updating predictions
DROP POLICY IF EXISTS "Users can update own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.predictions;
CREATE POLICY "Users can update their own predictions"
    ON public.predictions FOR UPDATE
    USING (
        auth.uid() = user_id OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        (auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND status = 'active'
        ))
        OR public.is_admin(auth.uid())
    );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
