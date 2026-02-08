-- Create tournament_participants table to manage which users can participate in tournaments
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id
  ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id
  ON public.tournament_participants(user_id);

-- Enable RLS
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_participants
-- Anyone authenticated can read tournament participants
CREATE POLICY "Public read access for tournament participants" ON public.tournament_participants
  FOR SELECT
  USING (true);

-- Only admins can manage tournament participants
CREATE POLICY "Admins can insert tournament participants" ON public.tournament_participants
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournament participants" ON public.tournament_participants
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Update tournament_rankings view to only include designated participants
DROP VIEW IF EXISTS public.tournament_rankings;

CREATE OR REPLACE VIEW public.tournament_rankings AS
SELECT
  p.user_id,
  m.tournament_id,
  CASE
    WHEN u.deleted_at IS NOT NULL THEN '[Deleted User]'
    ELSE u.screen_name
  END AS screen_name,
  CASE
    WHEN u.deleted_at IS NOT NULL THEN NULL
    ELSE u.avatar_url
  END AS avatar_url,
  COUNT(DISTINCT p.id) as predictions_count,
  COALESCE(SUM(p.points_earned), 0) as total_points,
  RANK() OVER (
    PARTITION BY m.tournament_id
    ORDER BY COALESCE(SUM(p.points_earned), 0) DESC
  ) as rank
FROM public.predictions p
JOIN public.matches m ON p.match_id = m.id
JOIN public.users u ON p.user_id = u.id
JOIN public.tournament_participants tp ON tp.tournament_id = m.tournament_id AND tp.user_id = p.user_id
WHERE m.tournament_id IS NOT NULL
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url, u.deleted_at;

-- Grant access
GRANT SELECT ON public.tournament_participants TO authenticated;
GRANT ALL ON public.tournament_participants TO service_role;
GRANT SELECT ON public.tournament_rankings TO authenticated;
GRANT SELECT ON public.tournament_rankings TO anon;
