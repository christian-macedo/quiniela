-- ============================================================================
-- Add Prediction Breakdown View
-- ============================================================================
-- Migration: 20260611000000_add_prediction_breakdown_view
-- Created: 2026-06-11
-- Description: Adds tournament_prediction_breakdown VIEW that counts, per user
--              per tournament, how many predictions landed in each scoring
--              category over completed matches:
--                - exact_count     : exact score (3 base pts)
--                - goal_diff_count : correct winner + correct goal diff (2 base pts)
--                - winner_count    : correct winner only (1 base pt)
--
--              The category arithmetic below mirrors getBasePoints() in
--              lib/utils/scoring.ts -- keep the two in lockstep. Mirrors the
--              tournament_rankings view (security_invoker, tournament_participants
--              join, active-user filter).
-- ============================================================================

CREATE OR REPLACE VIEW public.tournament_prediction_breakdown
WITH (security_invoker = true) AS
SELECT
    p.user_id,
    m.tournament_id,
    u.screen_name,
    u.avatar_url,
    COUNT(*) FILTER (
        WHERE p.predicted_home_score = m.home_score
          AND p.predicted_away_score = m.away_score
    ) AS exact_count,
    COUNT(*) FILTER (
        WHERE NOT (p.predicted_home_score = m.home_score AND p.predicted_away_score = m.away_score)
          AND sign(p.predicted_home_score - p.predicted_away_score)
                = sign(m.home_score - m.away_score)
          AND abs(p.predicted_home_score - p.predicted_away_score)
                = abs(m.home_score - m.away_score)
    ) AS goal_diff_count,
    COUNT(*) FILTER (
        WHERE NOT (p.predicted_home_score = m.home_score AND p.predicted_away_score = m.away_score)
          AND sign(p.predicted_home_score - p.predicted_away_score)
                = sign(m.home_score - m.away_score)
          AND abs(p.predicted_home_score - p.predicted_away_score)
                <> abs(m.home_score - m.away_score)
    ) AS winner_count,
    COALESCE(SUM(p.points_earned), 0) AS total_points
FROM public.predictions p
JOIN public.matches m ON p.match_id = m.id
JOIN public.users u ON p.user_id = u.id
JOIN public.tournament_participants tp
    ON tp.tournament_id = m.tournament_id
    AND tp.user_id = p.user_id
WHERE u.status = 'active'
  AND m.status = 'completed'
  AND m.home_score IS NOT NULL
  AND m.away_score IS NOT NULL
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
