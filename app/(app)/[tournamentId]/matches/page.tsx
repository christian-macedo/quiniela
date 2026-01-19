import { createClient } from "@/lib/supabase/server";
import { MatchList } from "@/components/matches/match-list";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MatchesPage({
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

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{tournament?.name}</h1>
          <p className="text-muted-foreground">Upcoming and completed matches</p>
        </div>
        <div className="flex gap-2">
        <Link href={`/${tournamentId}`}>
          <Button variant="outline">Back to Tournament</Button>
        </Link>
        </div>
      </div>
      <MatchList matches={matches || []} />
    </div>
  );
}
