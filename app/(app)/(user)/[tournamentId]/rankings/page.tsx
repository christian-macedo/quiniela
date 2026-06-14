import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RankingsTabs } from "@/components/rankings/rankings-tabs";
import { BreakdownWithPublicUser, RankingWithPublicUser } from "@/types/database";
import { buildLeaderboard } from "@/lib/utils/leaderboard";
import { comparePosition, type PositionChange } from "@/lib/utils/position-change";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import { getTranslations } from "next-intl/server";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const t = await getTranslations("rankings");
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  const { data: breakdownData } = await supabase
    .from("tournament_prediction_breakdown")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  // Sort both cards consistently: points -> exact -> winner+goal diff -> winner,
  // with tied participants sharing a rank.
  const { rankings: sortedRankings, breakdown } = buildLeaderboard(
    (rankings || []) as RankingWithPublicUser[],
    (breakdownData || []) as BreakdownWithPublicUser[]
  );

  // ---- Position change vs. the single most recently completed match ----
  // The "_previous" views recompute each standing while excluding that match.
  // Run the same buildLeaderboard over them so previous ranks are computed
  // identically to current ones, then compare per player.
  const { count: completedCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "completed");
  const hasLatestResult = (completedCount ?? 0) > 0;

  const { data: previousRankingsData } = await supabase
    .from("tournament_rankings_previous")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  const { data: previousBreakdownData } = await supabase
    .from("tournament_prediction_breakdown_previous")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  const { rankings: previousRankings, breakdown: previousBreakdown } = buildLeaderboard(
    (previousRankingsData || []) as RankingWithPublicUser[],
    (previousBreakdownData || []) as BreakdownWithPublicUser[]
  );

  const previousRankByUser = new Map(previousRankings.map((r) => [r.user_id, r.rank]));
  const rankingChanges: Record<string, PositionChange> = {};
  sortedRankings.forEach((ranking) => {
    rankingChanges[ranking.user_id] = comparePosition(
      previousRankByUser.get(ranking.user_id),
      ranking.rank
    );
  });

  const previousBreakdownRankByUser = new Map(previousBreakdown.map((b) => [b.user_id, b.rank]));
  const breakdownChanges: Record<string, PositionChange> = {};
  breakdown.forEach((row) => {
    breakdownChanges[row.user_id] = comparePosition(
      previousBreakdownRankByUser.get(row.user_id),
      row.rank
    );
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournament?.name ?? ""}
        items={[{ label: t("breadcrumb") }]}
      />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{tournament?.name}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <BackButton fallbackHref={`/${tournamentId}`} />
        </div>
      </div>
      <RankingsTabs
        rankings={sortedRankings}
        breakdown={breakdown}
        currentUserId={user?.id}
        tournamentId={tournamentId}
        rankingChanges={rankingChanges}
        breakdownChanges={breakdownChanges}
        hasLatestResult={hasLatestResult}
      />
    </div>
  );
}
