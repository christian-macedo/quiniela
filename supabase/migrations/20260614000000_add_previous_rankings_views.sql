-- ============================================================================
-- Previous Rankings Views (position-change indicator)
-- ============================================================================
-- Migration: 20260614000000_add_previous_rankings_views
-- Created: 2026-06-14
-- Description: The leaderboard is fully stateless -- tournament_rankings and
--              tournament_prediction_breakdown are computed views with no
--              history of where each player previously sat. To show a
--              position-change indicator (up / down / same) driven by the
--              single most recently completed match, we recompute each
--              standing while EXCLUDING that one match, then compare.
--
--              These two "_previous" views mirror their live counterparts
--              exactly, but drop the latest completed match per tournament.
--
--              Latest completed match per tournament is the row with the most
--              recent match_date (id as deterministic tiebreak) among
--              status = 'completed' matches.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View A: tournament_rankings_previous
-- Mirrors tournament_rankings (20240109000000_drop_rankings_table.sql),
-- excluding the latest completed match per tournament.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW tournament_rankings_previous AS
WITH latest_match AS (
  SELECT DISTINCT ON (tournament_id)
    tournament_id,
    id AS match_id
  FROM matches
  WHERE status = 'completed'
  ORDER BY tournament_id, match_date DESC, id DESC
)
SELECT
  p.user_id,
  m.tournament_id,
  COALESCE(SUM(p.points_earned), 0)::INTEGER as total_points,
  RANK() OVER (
    PARTITION BY m.tournament_id
    ORDER BY COALESCE(SUM(p.points_earned), 0) DESC
  )::INTEGER as rank
FROM
  predictions p
  INNER JOIN matches m ON p.match_id = m.id
  LEFT JOIN latest_match lm ON lm.tournament_id = m.tournament_id
WHERE
  m.id IS DISTINCT FROM lm.match_id
GROUP BY
  p.user_id, m.tournament_id;

GRANT SELECT ON tournament_rankings_previous TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- View B: tournament_prediction_breakdown_previous
-- Mirrors tournament_prediction_breakdown
-- (20260611100000_fix_prediction_breakdown_view_player_set.sql), excluding the
-- latest completed match per tournament. Category arithmetic mirrors
-- getBasePoints() in lib/utils/scoring.ts -- keep the two in lockstep.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.tournament_prediction_breakdown_previous
WITH (security_invoker = true) AS
WITH latest_match AS (
  SELECT DISTINCT ON (tournament_id)
    tournament_id,
    id AS match_id
  FROM public.matches
  WHERE status = 'completed'
  ORDER BY tournament_id, match_date DESC, id DESC
)
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
LEFT JOIN latest_match lm ON lm.tournament_id = m.tournament_id
WHERE u.status = 'active'
  AND m.id IS DISTINCT FROM lm.match_id
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
