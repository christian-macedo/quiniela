import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/utils/admin";
import { TeamDetailView } from "@/components/teams/management/team-detail-view";

interface TeamDetailPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
  }

  // Fetch team details
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    notFound();
  }

  // Fetch tournaments this team is part of
  const { data: tournamentTeams } = await supabase
    .from("tournament_teams")
    .select("tournament_id")
    .eq("team_id", teamId);

  // Fetch tournament details separately
  const tournamentIds = tournamentTeams?.map((tt) => tt.tournament_id) || [];
  const { data: tournamentsData } =
    tournamentIds.length > 0
      ? await supabase
          .from("tournaments")
          .select("id, name, sport, start_date, end_date, status")
          .in("id", tournamentIds)
      : { data: [] };

  // Fetch matches for this team
  const { data: homeMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      tournament:tournaments(id, name)
    `
    )
    .eq("home_team_id", teamId)
    .order("match_date", { ascending: true });

  const { data: awayMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      tournament:tournaments(id, name)
    `
    )
    .eq("away_team_id", teamId)
    .order("match_date", { ascending: true });

  // Combine and sort matches
  const allMatches = [...(homeMatches || []), ...(awayMatches || [])].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  // Group matches by tournament
  const matchesByTournament = allMatches.reduce(
    (acc, match) => {
      const tournamentId = match.tournament_id;
      const tournamentName = match.tournament?.name || "Unknown Tournament";

      if (!acc[tournamentId]) {
        acc[tournamentId] = {
          tournamentId,
          tournamentName,
          matches: [],
        };
      }
      acc[tournamentId].matches.push(match);
      return acc;
    },
    {} as Record<
      string,
      { tournamentId: string; tournamentName: string; matches: typeof allMatches }
    >
  );

  const tournaments = tournamentsData || [];

  return (
    <div className="container mx-auto py-8 px-4">
      <TeamDetailView
        team={team}
        matchesByTournament={Object.values(matchesByTournament)}
        tournaments={tournaments}
      />
    </div>
  );
}
