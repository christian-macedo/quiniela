import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/utils/admin";
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

  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
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

  // Fetch participants from tournament_participants table
  const { data: tournamentParticipants } = await supabase
    .from("tournament_participants")
    .select(`
      user_id,
      joined_at,
      users (
        id,
        email,
        screen_name,
        avatar_url
      )
    `)
    .eq("tournament_id", tournamentId)
    .order("joined_at", { ascending: true });

  type ParticipantUser = { id: string; email: string; screen_name: string | null; avatar_url: string | null };

  const participantUsers = (tournamentParticipants?.map(tp => tp.users).filter(Boolean) || []) as unknown as ParticipantUser[];

  // Fetch rankings for participants
  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select("user_id, total_points, rank")
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  const rankingsMap: Record<string, { total_points: number; rank: number }> = {};
  (rankings || []).forEach(r => {
    rankingsMap[r.user_id] = { total_points: r.total_points, rank: r.rank };
  });

  // Build participants list with rankings
  const participants = participantUsers.map(user => ({
    user,
    total_points: rankingsMap[user.id]?.total_points || 0,
    rank: rankingsMap[user.id]?.rank || null,
  }));

  // Fetch all users for the dropdown
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, email, screen_name, avatar_url")
    .order("screen_name");

  return (
    <div className="container mx-auto py-8 px-4">
      <TournamentDetailView
        tournament={tournament}
        teams={teams || []}
        allTeams={allTeams || []}
        matches={matches || []}
        participants={participants}
        allUsers={(allUsers as unknown as ParticipantUser[]) || []}
      />
    </div>
  );
}
