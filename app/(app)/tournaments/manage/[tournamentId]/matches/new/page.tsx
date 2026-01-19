import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MatchCreateForm } from "@/components/matches/management";
import { Team } from "@/types/database";

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const supabase = await createClient();
  const { tournamentId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    redirect("/tournaments/manage");
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
          <h1 className="text-3xl font-bold">Create New Match</h1>
          <p className="text-muted-foreground mt-1">{tournament.name}</p>
        </div>
      </div>

      <MatchCreateForm tournamentId={tournamentId} teams={teams} />
    </div>
  );
}
