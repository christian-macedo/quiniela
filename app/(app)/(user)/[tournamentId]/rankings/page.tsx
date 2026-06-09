import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { RankingWithPublicUser } from "@/types/database";
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
      <RankingsTable
        rankings={(rankings || []) as RankingWithPublicUser[]}
        currentUserId={user?.id}
        tournamentId={tournamentId}
      />
    </div>
  );
}
