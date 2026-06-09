import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MatchList } from "@/components/matches/match-list";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import { getTranslations } from "next-intl/server";

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const t = await getTranslations("matches");
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

  const { data: matches } = await supabase
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

  return (
    <div className="container mx-auto py-8 px-4">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournament?.name ?? ""}
        items={[{ label: t("title") }]}
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
      <MatchList matches={matches || []} />
    </div>
  );
}
