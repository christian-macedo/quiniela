import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TournamentDetailView } from "@/components/tournaments/management/tournament-detail-view";

interface TournamentDetailPageProps {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch tournament details
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // Fetch teams in this tournament
  const { data: tournamentTeamsData } = await supabase
    .from("tournament_teams")
    .select("team_id")
    .eq("tournament_id", tournamentId);

  const teamIds = tournamentTeamsData?.map(tt => tt.team_id) || [];
  
  const { data: teams } = teamIds.length > 0 
    ? await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds)
        .order("name")
    : { data: [] };

  // Fetch all available teams for adding
  const { data: allTeams } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  // Fetch matches for this tournament
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .eq("tournament_id", tournamentId)
    .order("match_date", { ascending: true });

  // Fetch participants (users with predictions/rankings)
  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select("user_id, total_points, rank")
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  // Get all user IDs who have made predictions
  const matchIds = matches?.map(m => m.id) || [];
  const rankedUserIds = rankings?.map(r => r.user_id) || [];
  const allParticipantUserIds = [...rankedUserIds];
  
  if (matchIds.length > 0) {
    const { data: predictions } = await supabase
      .from("predictions")
      .select("user_id")
      .in("match_id", matchIds);

    const predictionUserIds = [...new Set(
      (predictions || []).map(p => p.user_id)
    )];
    
    // Add prediction users not already in rankings
    predictionUserIds.forEach(id => {
      if (!allParticipantUserIds.includes(id)) {
        allParticipantUserIds.push(id);
      }
    });
  }

  // Fetch user details for all participants
  type ParticipantUser = { id: string; email: string; screen_name: string | null; avatar_url: string | null };
  const usersMap: Record<string, ParticipantUser> = {};
  
  if (allParticipantUserIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email, screen_name, avatar_url")
      .in("id", allParticipantUserIds);
    
    (users || []).forEach(u => {
      usersMap[u.id] = u as ParticipantUser;
    });
  }

  // Build participants list
  const participants = [
    ...(rankings?.map(r => ({
      user: usersMap[r.user_id] || null,
      total_points: r.total_points,
      rank: r.rank,
    })) || []),
    ...allParticipantUserIds
      .filter(id => !rankedUserIds.includes(id))
      .map(id => ({
        user: usersMap[id] || null,
        total_points: 0,
        rank: null as number | null,
      }))
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <TournamentDetailView 
        tournament={tournament}
        teams={teams || []}
        allTeams={allTeams || []}
        matches={matches || []}
        participants={participants}
      />
    </div>
  );
}
