import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TournamentManagementList } from "@/components/tournaments/management/tournament-management-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TournamentManagementPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  // Get team counts per tournament
  const { data: tournamentTeams } = await supabase
    .from("tournament_teams")
    .select("tournament_id");

  const teamCounts: Record<string, number> = {};
  tournamentTeams?.forEach((tt) => {
    teamCounts[tt.tournament_id] = (teamCounts[tt.tournament_id] || 0) + 1;
  });

  // Get match counts per tournament
  const { data: matches } = await supabase
    .from("matches")
    .select("tournament_id");

  const matchCounts: Record<string, number> = {};
  matches?.forEach((m) => {
    matchCounts[m.tournament_id] = (matchCounts[m.tournament_id] || 0) + 1;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Tournament Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage tournaments
          </p>
        </div>
        <Link href="/tournaments/manage/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        </Link>
      </div>
      <TournamentManagementList 
        tournaments={tournaments || []} 
        teamCounts={teamCounts}
        matchCounts={matchCounts}
      />
    </div>
  );
}
