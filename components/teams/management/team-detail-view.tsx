"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Team, MatchWithTeams } from "@/types/database";
import { TeamBadge } from "@/components/teams/team-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Calendar, Trophy } from "lucide-react";
import { MatchCard } from "@/components/matches/match-card";

interface MatchWithTournament extends MatchWithTeams {
  tournament?: { id: string; name: string };
}

interface TournamentMatches {
  tournamentId: string;
  tournamentName: string;
  matches: MatchWithTournament[];
}

interface TournamentData {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface TeamDetailViewProps {
  team: Team;
  matchesByTournament: TournamentMatches[];
  tournaments: TournamentData[];
}

export function TeamDetailView({ team, matchesByTournament, tournaments }: TeamDetailViewProps) {
  const t = useTranslations("teams.detail");
  const tCommon = useTranslations("common.labels");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Link href="/teams">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <TeamBadge team={team} size="lg" showName={false} />
            <div>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <p className="text-muted-foreground">
                {team.short_name}
                {team.country_code && ` • ${team.country_code}`}
              </p>
            </div>
          </div>
        </div>
        <Link href={`/teams/${team.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {t("editTeam")}
          </Button>
        </Link>
      </div>

      {/* Tournaments */}
      {tournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {t("tournaments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tournaments.map((tournament) => (
                <Link key={tournament.id} href={`/${tournament.id}/matches`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                    {tournament.name}
                    <span className="ml-2 text-xs opacity-70">({tournament.status})</span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches by Tournament */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          {t("matches")}
        </h2>

        {matchesByTournament.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("noMatchesYet")}</p>
            </CardContent>
          </Card>
        ) : (
          matchesByTournament.map(({ tournamentId, tournamentName, matches }) => (
            <Card key={tournamentId}>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link href={`/${tournamentId}/matches`} className="hover:underline">
                    {tournamentName}
                  </Link>
                  <Badge variant="outline" className="ml-2">
                    {matches.length} {matches.length === 1 ? tCommon("match") : tCommon("matches")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
