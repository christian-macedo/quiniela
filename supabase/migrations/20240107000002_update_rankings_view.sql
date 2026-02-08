-- Update tournament_rankings view to show deleted users anonymously
-- Preserves leaderboard integrity while hiding user identity

DROP VIEW IF EXISTS public.tournament_rankings;

CREATE OR REPLACE VIEW public.tournament_rankings AS
SELECT
    p.user_id,
    m.tournament_id,
    -- Show "[Deleted User]" for deactivated accounts
    CASE
        WHEN u.deleted_at IS NOT NULL THEN '[Deleted User]'
        ELSE u.screen_name
    END AS screen_name,
    -- Hide avatar for deleted users
    CASE
        WHEN u.deleted_at IS NOT NULL THEN NULL
        ELSE u.avatar_url
    END AS avatar_url,
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
-- Include ALL users (active and deleted) to preserve leaderboard history
-- Deleted users show as "[Deleted User]" instead of being hidden
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url, u.deleted_at;

-- Grant permissions
GRANT SELECT ON public.tournament_rankings TO anon, authenticated;
