import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import { UserPredictionsView } from "@/components/rankings/user-predictions-view";
import { getPublicUserDisplay } from "@/lib/utils/privacy";
import { getTranslations } from "next-intl/server";

export default async function UserRankingDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string; userId: string }>;
}) {
  const t = await getTranslations("rankings");
  const { tournamentId, userId } = await params;
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Fetch tournament info
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  // Fetch the user being viewed (explicit field selection for privacy)
  const { data: viewedUser } = await supabase
    .from("users")
    .select("id, screen_name, avatar_url, status, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (!viewedUser) {
    notFound();
  }

  // Fetch user's ranking in this tournament
  const { data: ranking } = await supabase
    .from("tournament_rankings")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId)
    .single();

  // Fetch user's predictions for this tournament with match details
  const { data: predictions } = await supabase
    .from("predictions")
    .select(
      `
      *,
      match:matches!inner(
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      )
    `
    )
    .eq("match.tournament_id", tournamentId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const isCurrentUser = currentUser?.id === userId;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        items={[
          { label: t("breadcrumb"), href: `/${tournamentId}/rankings` },
          { label: getPublicUserDisplay(viewedUser) },
        ]}
      />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            {getPublicUserDisplay(viewedUser)}
            {isCurrentUser && (
              <span className="ml-2 text-lg text-muted-foreground">
                ({t("userPredictions.you")})
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            {t("userPredictions.predictionsFor", { tournament: tournament.name })}
          </p>
        </div>
        <BackButton fallbackHref={`/${tournamentId}/rankings`} />
      </div>
      <UserPredictionsView
        user={viewedUser}
        predictions={predictions || []}
        ranking={ranking}
        isCurrentUser={isCurrentUser}
      />
    </div>
  );
}
