import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import { MatchDetailView } from "@/components/matches/match-detail-view";
import { getTranslations } from "next-intl/server";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const t = await getTranslations("matches");
  const tCommon = await getTranslations("common");
  const { tournamentId, matchId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    notFound();
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

  const matchLabel = `${match.home_team.name} ${tCommon("vs")} ${match.away_team.name}`;

  return (
    <div className="container mx-auto py-8 px-4">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournament?.name ?? ""}
        items={[
          { label: t("title"), href: `/${tournamentId}/matches` },
          { label: matchLabel },
        ]}
      />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("matchSummary")}</h1>
          <p className="text-muted-foreground">{tournament?.name}</p>
        </div>
        <BackButton fallbackHref={`/${tournamentId}/matches`} />
      </div>
      <MatchDetailView
        match={match}
        predictions={predictions || []}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
