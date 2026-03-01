import { createClient } from "@/lib/supabase/server";
import { TeamManagementList } from "@/components/teams/management/team-management-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function TeamsPage() {
  const t = await getTranslations("teams");
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: tournamentTeams } = await supabase
    .from("tournament_teams")
    .select("tournament_id, team_id");

  // Build a map of team_id -> tournament_ids for filtering
  const teamTournamentMap: Record<string, string[]> = {};
  tournamentTeams?.forEach((tt) => {
    if (!teamTournamentMap[tt.team_id]) {
      teamTournamentMap[tt.team_id] = [];
    }
    teamTournamentMap[tt.team_id].push(tt.tournament_id);
  });

  // Get unique country codes from teams
  const countryCodes = [
    ...new Set(teams?.map((t) => t.country_code).filter(Boolean) as string[]),
  ].sort();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/teams/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("addTeam")}
          </Button>
        </Link>
      </div>
      <TeamManagementList
        teams={teams || []}
        tournaments={tournaments || []}
        teamTournamentMap={teamTournamentMap}
        countryCodes={countryCodes}
      />
    </div>
  );
}
