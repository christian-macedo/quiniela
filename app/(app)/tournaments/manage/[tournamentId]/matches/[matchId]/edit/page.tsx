import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MatchEditForm } from "@/components/matches/management";
import { Team } from "@/types/database";

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const supabase = await createClient();
  const { tournamentId, matchId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch match details
  const { data: match } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .eq("id", matchId)
    .single();

  if (!match || match.tournament_id !== tournamentId) {
    redirect(`/tournaments/manage/${tournamentId}/matches`);
  }

  // Fetch teams registered in this tournament
  const { data: tournamentTeams } = await supabase
    .from("tournament_teams")
    .select(`
      team_id,
      teams (*)
    `)
    .eq("tournament_id", tournamentId);

  const teams = (tournamentTeams?.map((tt) => tt.teams).filter(Boolean) || []) as unknown as Team[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/tournaments/manage/${tournamentId}/matches`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Match</h1>
          <p className="text-muted-foreground mt-1">
            {match.home_team.name} vs {match.away_team.name}
          </p>
        </div>
      </div>

      <MatchEditForm
        match={match as {
          id: string;
          tournament_id: string;
          home_team_id: string;
          away_team_id: string;
          match_date: string;
          home_score: number | null;
          away_score: number | null;
          status: "scheduled" | "in_progress" | "completed" | "cancelled";
          round: string | null;
          multiplier: number;
          home_team: Team;
          away_team: Team;
        }}
        teams={teams}
      />
    </div>
  );
}
