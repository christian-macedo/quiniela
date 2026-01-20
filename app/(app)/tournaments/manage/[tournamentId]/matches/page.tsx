import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/admin";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MatchManagementList } from "@/components/matches/management";

export default async function MatchesManagementPage({
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

  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
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

  // Fetch matches with team details
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .eq("tournament_id", tournamentId)
    .order("match_date", { ascending: true });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/tournaments/manage/${tournamentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Manage Matches</h1>
          <p className="text-muted-foreground mt-1">{tournament.name}</p>
        </div>
        <Link href={`/tournaments/manage/${tournamentId}/matches/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Match
          </Button>
        </Link>
      </div>

      <MatchManagementList matches={matches || []} />
    </div>
  );
}
