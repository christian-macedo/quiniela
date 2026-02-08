import { createClient } from "@/lib/supabase/server";
import { TournamentDashboard } from "@/components/tournaments/tournament-dashboard";
import { redirect } from "next/navigation";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch tournament details
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    redirect("/tournaments");
  }

  // Fetch matches with teams
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .eq("tournament_id", tournamentId)
    .order("match_date", { ascending: true });

  // Fetch rankings
  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select(`
      *,
      user:users(id, screen_name, avatar_url)
    `)
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  // Get user stats
  const userRanking = rankings?.find(r => r.user_id === user.id);

  // Count user's predictions for this tournament
  const matchIds = matches?.map(m => m.id) || [];
  let totalPredictions = 0;

  if (matchIds.length > 0) {
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
        rankings={rankings || []}
        currentUserId={user.id}
        userStats={userStats}
        tournamentStats={tournamentStats}
      />
    </div>
  );
}
