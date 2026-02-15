-- Create a view that calculates tournament rankings dynamically from predictions
-- This replaces the tournament_rankings table with a computed view
CREATE OR REPLACE VIEW tournament_rankings AS
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
GROUP BY
  p.user_id, m.tournament_id;

-- Grant SELECT permissions on the view
GRANT SELECT ON tournament_rankings TO authenticated, anon;
