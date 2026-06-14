import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import { TournamentInsights } from "@/components/tournaments/tournament-insights";
import type {
  MatchWithTeams,
  Prediction,
  RankingWithPublicUser,
  BreakdownWithPublicUser,
} from "@/types/database";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const t = await getTranslations("insights");
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  // All matches with teams (totals need every match; stats use completed ones).
  const { data: matchesData } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("match_date", { ascending: true });

  const matches = (matchesData ?? []) as MatchWithTeams[];
  const matchIds = matches.map((m) => m.id);

  // Every prediction across the tournament (predicted scores + awarded points).
  let predictions: Pick<
    Prediction,
    "match_id" | "predicted_home_score" | "predicted_away_score" | "points_earned"
  >[] = [];
  if (matchIds.length > 0) {
    const { data: predictionData } = await supabase
      .from("predictions")
      .select("match_id, predicted_home_score, predicted_away_score, points_earned")
      .in("match_id", matchIds);
    predictions = predictionData ?? [];
  }

  // Group predictions by match for the completed-match stat groups.
  const byMatch = new Map<
    string,
    { predicted_home_score: number; predicted_away_score: number }[]
  >();
  for (const p of predictions) {
    const list = byMatch.get(p.match_id) ?? [];
    list.push({
      predicted_home_score: p.predicted_home_score,
      predicted_away_score: p.predicted_away_score,
    });
    byMatch.set(p.match_id, list);
  }

  const completed = matches
    .filter((m) => m.status === "completed" && m.home_score !== null && m.away_score !== null)
    .map((match) => ({ match, predictions: byMatch.get(match.id) ?? [] }));

  const totalPointsAwarded = predictions.reduce((sum, p) => sum + (p.points_earned ?? 0), 0);

  const { count: participantCount } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const { data: rankingsData } = await supabase
    .from("tournament_rankings")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  const { data: breakdownData } = await supabase
    .from("tournament_prediction_breakdown")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        items={[{ label: t("breadcrumb") }]}
      />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <BackButton fallbackHref={`/${tournamentId}`} />
      </div>
      <TournamentInsights
        tournamentId={tournamentId}
        completed={completed}
        totals={{
          participantCount: participantCount ?? 0,
          totalMatches: matches.length,
          predictionsSubmitted: predictions.length,
          totalPointsAwarded,
        }}
        rankings={(rankingsData ?? []) as RankingWithPublicUser[]}
        breakdown={(breakdownData ?? []) as BreakdownWithPublicUser[]}
      />
    </div>
  );
}
