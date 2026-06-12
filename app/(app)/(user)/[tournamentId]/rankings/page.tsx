import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RankingsTabs } from "@/components/rankings/rankings-tabs";
import { BreakdownWithPublicUser, RankingWithPublicUser } from "@/types/database";
import { getPublicUserDisplay } from "@/lib/utils/privacy";
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
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  // Sort: highest points -> alphabetical by display name (deterministic tie-break)
  const sortedRankings = ((rankings || []) as RankingWithPublicUser[])
    .slice()
    .sort(
      (a, b) =>
        b.total_points - a.total_points ||
        getPublicUserDisplay(a.user).localeCompare(getPublicUserDisplay(b.user))
    );

  const { data: breakdownData } = await supabase
    .from("tournament_prediction_breakdown")
    .select(
      `
      *,
      user:users(id, screen_name, avatar_url, created_at, updated_at)
    `
    )
    .eq("tournament_id", tournamentId);

  // Sort: most exact -> most goal-diff -> most winner -> alphabetical by display name
  const breakdown = ((breakdownData || []) as BreakdownWithPublicUser[])
    .slice()
    .sort(
      (a, b) =>
        b.exact_count - a.exact_count ||
        b.goal_diff_count - a.goal_diff_count ||
        b.winner_count - a.winner_count ||
        getPublicUserDisplay(a.user).localeCompare(getPublicUserDisplay(b.user))
    );

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
      />
    </div>
  );
}
