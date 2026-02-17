import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/utils/admin";
import { TournamentManagementList } from "@/components/tournaments/management/tournament-management-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function TournamentManagementPage() {
  const t = await getTranslations("tournaments.management");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Require admin permissions
  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
  }

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  // Get team counts per tournament
  const { data: tournamentTeams } = await supabase.from("tournament_teams").select("tournament_id");

  const teamCounts: Record<string, number> = {};
  tournamentTeams?.forEach((tt) => {
    teamCounts[tt.tournament_id] = (teamCounts[tt.tournament_id] || 0) + 1;
  });

  // Get match counts per tournament
  const { data: matches } = await supabase.from("matches").select("tournament_id");

  const matchCounts: Record<string, number> = {};
  matches?.forEach((m) => {
    matchCounts[m.tournament_id] = (matchCounts[m.tournament_id] || 0) + 1;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/tournaments/manage/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("createTournament")}
          </Button>
        </Link>
      </div>
      <TournamentManagementList
        tournaments={tournaments || []}
        teamCounts={teamCounts}
        matchCounts={matchCounts}
      />
    </div>
  );
}
