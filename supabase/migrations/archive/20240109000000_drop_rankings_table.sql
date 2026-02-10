-- Drop the tournament_rankings table and replace with a view
-- The view is already created in the previous migration (20240108000000_create_rankings_view.sql)

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS tournament_rankings CASCADE;

-- Now create the view (rerunning in case it needs to be recreated)
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

-- Note: Since this is a view, we don't need RLS policies
-- The underlying tables (predictions, matches) already have RLS enabled
