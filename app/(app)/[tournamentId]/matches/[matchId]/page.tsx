import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MatchDetailView } from "@/components/matches/match-detail-view";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const { tournamentId, matchId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch match details with teams
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `
    )
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    redirect(`/${tournamentId}/matches`);
  }

  // Fetch tournament for display
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  // Fetch predictions for this match with user info
  const { data: predictions } = await supabase
    .from("predictions")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url)
    `
    )
    .eq("match_id", matchId);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Match Summary</h1>
          <p className="text-muted-foreground">{tournament?.name}</p>
        </div>
        <Link href={`/${tournamentId}/matches`}>
          <Button variant="outline">Back to Matches</Button>
        </Link>
      </div>
      <MatchDetailView
        match={match}
        predictions={predictions || []}
        currentUserId={user.id}
      />
    </div>
  );
}
