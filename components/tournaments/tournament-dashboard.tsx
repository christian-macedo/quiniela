"use client";

import Link from "next/link";
import { Tournament, MatchWithTeams, RankingWithUser } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/matches/match-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDate } from "@/lib/utils/date";
import {
  Calendar,
  Trophy,
  UserCircle,
  Target,
  TrendingUp
} from "lucide-react";

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
}

const statusColors = {
  upcoming: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
};

const statusLabels = {
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
};

export function TournamentDashboard({
  tournament,
  matches,
  rankings,
  currentUserId,
  userStats
}: TournamentDashboardProps) {
  const upcomingMatches = matches.filter(m => m.status === "scheduled").slice(0, 5);
  const recentMatches = matches.filter(m => m.status === "completed").slice(-5).reverse();
  const topRankings = rankings.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${statusColors[tournament.status]}`} />
          <Badge variant="outline" className="capitalize">
            {statusLabels[tournament.status]}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {tournament.sport}
          </Badge>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
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
            My Predictions
          </Button>
        </Link>
        <Link href={`/${tournament.id}/rankings`}>
          <Button variant="outline" size="lg">
            <Trophy className="h-4 w-4 mr-2" />
            Full Rankings
          </Button>
        </Link>
        <Link href={`/${tournament.id}/matches`}>
          <Button variant="outline" size="lg">
            <Calendar className="h-4 w-4 mr-2" />
            All Matches
          </Button>
        </Link>
      </div>

      {/* User Stats (if logged in) */}
      {userStats && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold">{userStats.rank || "-"}</p>
                <p className="text-sm text-muted-foreground">Your Rank</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{userStats.pointsEarned}</p>
                <p className="text-sm text-muted-foreground">Total Points</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{userStats.totalPredictions}</p>
                <p className="text-sm text-muted-foreground">Predictions</p>
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
                Leaderboard
              </CardTitle>
              <Link href={`/${tournament.id}/rankings`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topRankings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No rankings yet. Be the first to make a prediction!
              </p>
            ) : (
              <div className="space-y-2">
                {topRankings.map((ranking) => {
                  const isCurrentUser = ranking.user_id === currentUserId;
                  return (
                    <div
                      key={ranking.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isCurrentUser ? "bg-primary/10 border border-primary" : ""
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-6 text-center font-bold text-sm">
                        {ranking.rank <= 3 ? (
                          <span className="text-lg">
                            {ranking.rank === 1 && "🥇"}
                            {ranking.rank === 2 && "🥈"}
                            {ranking.rank === 3 && "🥉"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{ranking.rank}</span>
                        )}
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
                        {ranking.total_points} pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tournament Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tournament Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Total Matches</span>
                </div>
                <Badge variant="secondary">{matches.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Completed</span>
                </div>
                <Badge variant="secondary">
                  {matches.filter(m => m.status === "completed").length}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Participants</span>
                </div>
                <Badge variant="secondary">{rankings.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matches Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Matches
              </CardTitle>
              <Link href={`/${tournament.id}/matches`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No upcoming matches
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

        {/* Recent Results */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Recent Results
              </CardTitle>
              <Link href={`/${tournament.id}/matches`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No completed matches yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
