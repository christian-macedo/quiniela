import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import { CompareSelector } from "@/components/rankings/compare-selector";
import { ComparisonView, type ComparisonSide } from "@/components/rankings/comparison-view";
import { buildLeaderboard } from "@/lib/utils/leaderboard";
import {
  BreakdownWithPublicUser,
  PredictionWithMatch,
  PublicUserProfile,
  RankingWithPublicUser,
} from "@/types/database";
import { getTranslations } from "next-intl/server";

const PREDICTIONS_WITH_MATCH = `
  *,
  match:matches!inner(
    *,
    home_team:teams!matches_home_team_id_fkey(*),
    away_team:teams!matches_away_team_id_fkey(*)
  )
`;

/** Fetch a user's completed-match predictions for a tournament (most recent first). */
async function fetchCompletedPredictions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  userId: string
): Promise<PredictionWithMatch[]> {
  const { data } = await supabase
    .from("predictions")
    .select(PREDICTIONS_WITH_MATCH)
    .eq("match.tournament_id", tournamentId)
    .eq("match.status", "completed")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PredictionWithMatch[];
}

export default async function CompareRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ opponent?: string }>;
}) {
  const t = await getTranslations("rankings");
  const tCompare = await getTranslations("rankings.compare");
  const { tournamentId } = await params;
  const { opponent: opponentId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  // Leaderboard pipeline (mirrors rankings/page.tsx) — used for the opponent
  // picker and for each side's summary stats and rank.
  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select(`*, user:users(id, screen_name, avatar_url, created_at, updated_at)`)
    .eq("tournament_id", tournamentId);

  const { data: breakdownData } = await supabase
    .from("tournament_prediction_breakdown")
    .select(`*, user:users(id, screen_name, avatar_url, created_at, updated_at)`)
    .eq("tournament_id", tournamentId);

  const { rankings: sortedRankings, breakdown } = buildLeaderboard(
    (rankings || []) as RankingWithPublicUser[],
    (breakdownData || []) as BreakdownWithPublicUser[]
  );

  const rankingByUser = new Map(sortedRankings.map((r) => [r.user_id, r]));
  const breakdownByUser = new Map(breakdown.map((b) => [b.user_id, b]));

  const opponentRanking = opponentId ? rankingByUser.get(opponentId) : undefined;
  const isValidOpponent = !!opponentRanking && opponentId !== currentUser.id;

  // Build one comparison side from the leaderboard maps + completed predictions.
  async function buildSide(
    userId: string,
    user: PublicUserProfile
  ): Promise<ComparisonSide> {
    const ranking = rankingByUser.get(userId);
    const counts = breakdownByUser.get(userId);
    return {
      user,
      rank: ranking?.rank ?? null,
      totalPoints: ranking?.total_points ?? 0,
      exactCount: counts?.exact_count ?? 0,
      goalDiffCount: counts?.goal_diff_count ?? 0,
      winnerCount: counts?.winner_count ?? 0,
      predictions: await fetchCompletedPredictions(supabase, tournamentId, userId),
    };
  }

  let you: ComparisonSide | null = null;
  let opponent: ComparisonSide | null = null;

  if (isValidOpponent && opponentRanking) {
    // The current user's own public profile (may not be in the leaderboard if
    // they have no predictions yet, so fetch it explicitly).
    const { data: currentProfile } = await supabase
      .from("users")
      .select("id, screen_name, avatar_url, created_at, updated_at")
      .eq("id", currentUser.id)
      .single();

    if (currentProfile) {
      you = await buildSide(currentUser.id, currentProfile as PublicUserProfile);
      opponent = await buildSide(opponentId!, opponentRanking.user);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        items={[
          { label: t("breadcrumb"), href: `/${tournamentId}/rankings` },
          { label: tCompare("breadcrumb") },
        ]}
      />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{tCompare("title")}</h1>
          <p className="text-muted-foreground">{tCompare("subtitle")}</p>
        </div>
        <BackButton fallbackHref={`/${tournamentId}/rankings`} />
      </div>

      <div className="space-y-6">
        <CompareSelector
          participants={sortedRankings}
          currentUserId={currentUser.id}
          selectedOpponentId={isValidOpponent ? opponentId : undefined}
        />

        {you && opponent ? (
          <ComparisonView you={you} opponent={opponent} />
        ) : (
          <p className="text-muted-foreground">{tCompare("prompt")}</p>
        )}
      </div>
    </div>
  );
}
