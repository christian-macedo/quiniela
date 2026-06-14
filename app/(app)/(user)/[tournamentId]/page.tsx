import { createClient } from "@/lib/supabase/server";
import { TournamentDashboard } from "@/components/tournaments/tournament-dashboard";
import { buildLeaderboard } from "@/lib/utils/leaderboard";
import { comparePosition, type PositionChange } from "@/lib/utils/position-change";
import { BreakdownWithPublicUser, RankingWithPublicUser } from "@/types/database";
import { notFound } from "next/navigation";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch tournament details
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  // Fetch matches with teams
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("match_date", { ascending: true });

  // Fetch rankings
  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select(
      `
      *,
      user:users(*)
    `
    )
    .eq("tournament_id", tournamentId);

  // Accuracy breakdown powers the shared leaderboard tie-breakers.
  const { data: breakdownData } = await supabase
    .from("tournament_prediction_breakdown")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  // Sort consistently with the rankings page: points -> exact -> winner+goal
  // diff -> winner, with tied participants sharing a rank.
  const { rankings: sortedRankings } = buildLeaderboard(
    (rankings || []) as RankingWithPublicUser[],
    (breakdownData || []) as BreakdownWithPublicUser[]
  );

  // Position change vs. the single most recently completed match. The
  // "_previous" views recompute each standing while excluding that match; run
  // the same buildLeaderboard over them so ranks are comparable, then diff.
  const hasLatestResult = (matches || []).some((m) => m.status === "completed");

  const { data: previousRankingsData } = await supabase
    .from("tournament_rankings_previous")
    .select(`*, user:users(*)`)
    .eq("tournament_id", tournamentId);

  const { data: previousBreakdownData } = await supabase
    .from("tournament_prediction_breakdown_previous")
    .select(`*, user:users(id, screen_name, avatar_url, created_at, updated_at)`)
    .eq("tournament_id", tournamentId);

  const { rankings: previousRankings } = buildLeaderboard(
    (previousRankingsData || []) as RankingWithPublicUser[],
    (previousBreakdownData || []) as BreakdownWithPublicUser[]
  );

  const previousRankByUser = new Map(previousRankings.map((r) => [r.user_id, r.rank]));
  const rankingChanges: Record<string, PositionChange> = {};
  sortedRankings.forEach((ranking) => {
    rankingChanges[ranking.user_id] = comparePosition(
      previousRankByUser.get(ranking.user_id),
      ranking.rank
    );
  });

  // Get user stats from the consistently-ranked standings
  const userRanking = sortedRankings.find((r) => r.user_id === user?.id);

  // Count user's predictions for this tournament
  const matchIds = matches?.map((m) => m.id) || [];
  let totalPredictions = 0;

  if (matchIds.length > 0 && user) {
    const { count } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("match_id", matchIds);

    totalPredictions = count || 0;
  }

  const userStats = {
    totalPredictions,
    pointsEarned: userRanking?.total_points || 0,
    rank: userRanking?.rank || null,
  };

  // Count participants from tournament_participants table
  const { count: participantCount } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const tournamentStats = {
    participantCount: participantCount || 0,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <TournamentDashboard
        tournament={tournament}
        matches={matches || []}
        rankings={sortedRankings}
        currentUserId={user?.id ?? ""}
        userStats={userStats}
        tournamentStats={tournamentStats}
        rankingChanges={rankingChanges}
        hasLatestResult={hasLatestResult}
      />
    </div>
  );
}
