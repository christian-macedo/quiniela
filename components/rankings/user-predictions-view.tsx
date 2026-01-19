"use client";

import { User, TournamentRanking, Prediction, MatchWithTeams } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/teams/team-badge";
import { formatLocalDateTime } from "@/lib/utils/date";
import Link from "next/link";

interface PredictionWithMatch extends Prediction {
  match: MatchWithTeams;
}

interface UserPredictionsViewProps {
  user: User;
  predictions: PredictionWithMatch[];
  ranking: TournamentRanking | null;
  isCurrentUser: boolean;
}

export function UserPredictionsView({
  user,
  predictions,
  ranking,
  isCurrentUser,
}: UserPredictionsViewProps) {
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  // Sort predictions by match date (most recent first)
  const sortedPredictions = [...predictions].sort((a, b) => {
    return new Date(b.match.match_date).getTime() - new Date(a.match.match_date).getTime();
  });

  // Separate completed and upcoming matches
  const completedPredictions = sortedPredictions.filter(
    (p) => p.match.status === "completed"
  );
  const upcomingPredictions = sortedPredictions.filter(
    (p) => p.match.status !== "completed"
  );

  return (
    <div className="space-y-6">
      {/* User Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={user.avatar_url || undefined}
                alt={user.screen_name || user.email}
              />
              <AvatarFallback className="text-xl">
                {getInitials(user.screen_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {user.screen_name || user.email}
              </h2>
              {ranking && (
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {ranking.total_points} points
                  </Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Rank #{ranking.rank}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{predictions.length}</p>
            <p className="text-sm text-muted-foreground">Total Predictions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{completedPredictions.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{upcomingPredictions.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">
              {completedPredictions.length > 0
                ? (
                    (ranking?.total_points || 0) / completedPredictions.length
                  ).toFixed(1)
                : "0"}
            </p>
            <p className="text-sm text-muted-foreground">Avg Points/Match</p>
          </CardContent>
        </Card>
      </div>

      {/* Completed Predictions */}
      {completedPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedPredictions.map((prediction) => (
                <PredictionRow
                  key={prediction.id}
                  prediction={prediction}
                  showDetails={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Predictions */}
      {upcomingPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPredictions.map((prediction) => (
                <PredictionRow
                  key={prediction.id}
                  prediction={prediction}
                  showDetails={isCurrentUser}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {predictions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No predictions have been submitted yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PredictionRowProps {
  prediction: PredictionWithMatch;
  showDetails: boolean;
}

function PredictionRow({ prediction, showDetails }: PredictionRowProps) {
  const match = prediction.match;
  const isCompleted = match.status === "completed";
  const isLive = match.status === "in_progress";
  const isCancelled = match.status === "cancelled";

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge className="bg-blue-500">Completed</Badge>;
    }
    if (isLive) {
      return <Badge className="bg-green-500">Live</Badge>;
    }
    if (isCancelled) {
      return <Badge className="bg-red-500">Cancelled</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  return (
    <Link href={`/${match.tournament_id}/matches/${match.id}`}>
      <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
        {/* Match Header */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">
            {formatLocalDateTime(match.match_date)}
          </span>
          <div className="flex items-center gap-2">
            {match.multiplier > 1 && (
              <Badge
                variant="outline"
                className="text-orange-500 border-orange-500"
              >
                {match.multiplier}x
              </Badge>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* Teams and Scores */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <TeamBadge team={match.home_team} size="sm" showName={true} />
          </div>

          <div className="flex flex-col items-center gap-1">
            {/* Actual Score (if completed) */}
            {isCompleted &&
            match.home_score !== null &&
            match.away_score !== null ? (
              <div className="text-xl font-bold">
                {match.home_score} : {match.away_score}
              </div>
            ) : (
              <div className="text-lg text-muted-foreground">vs</div>
            )}

            {/* Prediction */}
            {showDetails ? (
              <div className="text-sm text-muted-foreground">
                Predicted:{" "}
                <span className="font-medium text-foreground">
                  {prediction.predicted_home_score} :{" "}
                  {prediction.predicted_away_score}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Prediction hidden
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-end">
            <TeamBadge team={match.away_team} size="sm" showName={true} />
          </div>
        </div>

        {/* Points (only for completed matches with visible details) */}
        {isCompleted && showDetails && !isCancelled && (
          <div className="mt-3 pt-3 border-t flex justify-end">
            <Badge
              variant={prediction.points_earned > 0 ? "default" : "outline"}
              className={
                prediction.points_earned >= 3 * match.multiplier
                  ? "bg-green-500"
                  : prediction.points_earned > 0
                  ? "bg-blue-500"
                  : ""
              }
            >
              {prediction.points_earned} points earned
            </Badge>
          </div>
        )}
      </div>
    </Link>
  );
}
