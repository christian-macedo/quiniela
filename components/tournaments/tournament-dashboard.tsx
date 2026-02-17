"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Tournament, MatchWithTeams, RankingWithUser } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/matches/match-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDate } from "@/lib/utils/date";
import { Calendar, Trophy, UserCircle, Target } from "lucide-react";

interface TournamentDashboardProps {
  tournament: Tournament;
  matches: MatchWithTeams[];
  rankings: RankingWithUser[];
  currentUserId?: string;
  userStats?: {
    totalPredictions: number;
    pointsEarned: number;
    rank: number | null;
  };
  tournamentStats?: {
    participantCount: number;
  };
}

const statusColors: Record<string, string> = {
  upcoming: "bg-info",
  active: "bg-success",
  completed: "bg-muted",
};

function getRankColor(rank: number | null): string {
  if (rank === 1) return "text-gold";
  if (rank === 2) return "text-silver";
  if (rank === 3) return "text-bronze";
  return "";
}

export function TournamentDashboard({
  tournament,
  matches,
  rankings,
  currentUserId,
  userStats,
  tournamentStats,
}: TournamentDashboardProps) {
  const t = useTranslations("tournaments");
  const tCommon = useTranslations("common");

  const upcomingMatches = matches.filter((m) => m.status === "scheduled").slice(0, 5);
  const recentMatches = matches
    .filter((m) => m.status === "completed")
    .slice(-5)
    .reverse();
  const topRankings = rankings.slice(0, 10);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`h-3 w-3 rounded-full ${statusColors[tournament.status] || "bg-muted"}`}
          />
          <Badge variant="outline" className="capitalize">
            {t(`status.${tournament.status}`)}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {tournament.sport}
          </Badge>
          {/* Inline tournament stats */}
          <Badge variant="outline" className="text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {matches.length} {tCommon(matches.length === 1 ? "labels.match" : "labels.matches")}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            <Trophy className="h-3 w-3 mr-1" />
            {matches.filter((m) => m.status === "completed").length}{" "}
            {t("dashboard.stats.completed").toLowerCase()}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            <UserCircle className="h-3 w-3 mr-1" />
            {tournamentStats?.participantCount || 0}{" "}
            {t("dashboard.stats.participants").toLowerCase()}
          </Badge>
        </div>
        <div>
          <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight mb-2">
            {tournament.name}
          </h1>
          <p className="text-muted-foreground">
            {formatLocalDate(tournament.start_date)} - {formatLocalDate(tournament.end_date)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/${tournament.id}/predictions`}>
          <Button size="lg">
            <Target className="h-4 w-4 mr-2" />
            {t("dashboard.myPredictions")}
          </Button>
        </Link>
        <Link href={`/${tournament.id}/rankings`}>
          <Button variant="outline" size="lg">
            <Trophy className="h-4 w-4 mr-2" />
            {t("dashboard.fullRankings")}
          </Button>
        </Link>
        <Link href={`/${tournament.id}/matches`}>
          <Button variant="outline" size="lg">
            <Calendar className="h-4 w-4 mr-2" />
            {t("dashboard.allMatches")}
          </Button>
        </Link>
      </div>

      {/* User Stats (if logged in) */}
      {userStats && (
        <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-accent/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="relative">
                <p className={`font-display text-4xl font-bold ${getRankColor(userStats.rank)}`}>
                  {userStats.rank || "-"}
                </p>
                <p className="text-sm text-muted-foreground">{t("dashboard.yourRank")}</p>
              </div>
              <div className="relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-px before:bg-border after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:h-8 after:w-px after:bg-border">
                <p className="font-display text-4xl font-bold">{userStats.pointsEarned}</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.totalPoints")}</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold">{userStats.totalPredictions}</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.predictions")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {t("dashboard.leaderboard")}
              </CardTitle>
              <Link href={`/${tournament.id}/rankings`}>
                <Button variant="ghost" size="sm">
                  {tCommon("actions.viewAll")}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topRankings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("dashboard.noRankings")}</p>
            ) : (
              <div className="space-y-2">
                {topRankings.map((ranking, index) => {
                  const isCurrentUser = ranking.user_id === currentUserId;
                  const podiumBorder =
                    ranking.rank === 1
                      ? "border-l-4 border-l-gold bg-gradient-to-r from-[hsl(var(--gold)/0.1)] to-transparent"
                      : ranking.rank === 2
                        ? "border-l-4 border-l-silver bg-gradient-to-r from-[hsl(var(--silver)/0.08)] to-transparent"
                        : ranking.rank === 3
                          ? "border-l-4 border-l-bronze bg-gradient-to-r from-[hsl(var(--bronze)/0.08)] to-transparent"
                          : "";

                  return (
                    <div
                      key={ranking.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg animate-slide-up ${
                        index < 5 ? `stagger-${index + 1}` : ""
                      } ${podiumBorder} ${isCurrentUser ? "ring-2 ring-primary/30" : ""}`}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center">
                        <span
                          className={`font-display text-xl font-bold ${getRankColor(ranking.rank)}`}
                        >
                          {ranking.rank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={ranking.user.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {ranking.user.screen_name?.[0]?.toUpperCase() ??
                            ranking.user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">
                          {ranking.user.screen_name ?? ranking.user.email}
                        </div>
                      </div>

                      {/* Points */}
                      <Badge variant="secondary" className="text-xs">
                        <span className="font-display font-bold">{ranking.total_points}</span>
                        <span className="ml-1">{tCommon("labels.pts")}</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("dashboard.upcomingMatches.title")}
              </CardTitle>
              <Link href={`/${tournament.id}/matches`}>
                <Button variant="ghost" size="sm">
                  {tCommon("actions.viewAll")}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t("dashboard.upcomingMatches.empty")}
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {t("dashboard.recentResults.title")}
            </CardTitle>
            <Link href={`/${tournament.id}/matches`}>
              <Button variant="ghost" size="sm">
                {tCommon("actions.viewAll")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentMatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("dashboard.recentResults.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
