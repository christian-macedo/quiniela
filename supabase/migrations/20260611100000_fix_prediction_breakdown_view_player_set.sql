-- ============================================================================
-- Fix Prediction Breakdown View Player Set
-- ============================================================================
-- Migration: 20260611100000_fix_prediction_breakdown_view_player_set
-- Created: 2026-06-11
-- Description: The original tournament_prediction_breakdown view (migration
--              20260611000000) filtered "m.status = 'completed'" in its WHERE
--              clause. That dropped any player who had no prediction on a
--              completed match, so a tournament with completed matches whose
--              ranked players had only predicted not-yet-completed matches
--              produced zero rows -- making the Breakdown tab look empty even
--              though completed matches existed.
--
--              Fix: move the completed-match condition INSIDE each
--              COUNT(...) FILTER. The row set now matches tournament_rankings:
--              every active participant with at least one prediction appears,
--              with zero category counts when they have no predictions on
--              completed matches yet.
--
--              Category arithmetic still mirrors getBasePoints() in
--              lib/utils/scoring.ts -- keep the two in lockstep.
-- ============================================================================

CREATE OR REPLACE VIEW public.tournament_prediction_breakdown
WITH (security_invoker = true) AS
SELECT
    p.user_id,
    m.tournament_id,
    u.screen_name,
    u.avatar_url,
    COUNT(*) FILTER (
        WHERE m.status = 'completed'
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
          AND p.predicted_home_score = m.home_score
          AND p.predicted_away_score = m.away_score
    ) AS exact_count,
    COUNT(*) FILTER (
        WHERE m.status = 'completed'
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
          AND NOT (p.predicted_home_score = m.home_score AND p.predicted_away_score = m.away_score)
          AND sign(p.predicted_home_score - p.predicted_away_score)
                = sign(m.home_score - m.away_score)
          AND abs(p.predicted_home_score - p.predicted_away_score)
                = abs(m.home_score - m.away_score)
    ) AS goal_diff_count,
    COUNT(*) FILTER (
        WHERE m.status = 'completed'
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
          AND NOT (p.predicted_home_score = m.home_score AND p.predicted_away_score = m.away_score)
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
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
