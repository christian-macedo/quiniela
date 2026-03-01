import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MatchManagementList } from "@/components/matches/management";

export default async function MatchesManagementPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const supabase = await createClient();
  const { tournamentId } = await params;

  // Fetch tournament details
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    redirect("/tournaments/manage");
  }

  // Fetch matches with team details
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

  const t = await getTranslations("matches.management");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/tournaments/manage/${tournamentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{tournament.name}</p>
        </div>
        <Link href={`/tournaments/manage/${tournamentId}/matches/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("createMatchButton")}
          </Button>
        </Link>
      </div>

      <MatchManagementList matches={matches || []} />
    </div>
  );
}
