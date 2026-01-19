"use client";

import { MatchWithTeams, Prediction } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/teams/team-badge";
import { formatLocalDateTime } from "@/lib/utils/date";
import { Trophy, Target, TrendingUp } from "lucide-react";

interface PredictionResultCardProps {
  match: MatchWithTeams;
  prediction: Prediction;
}

export function PredictionResultCard({ match, prediction }: PredictionResultCardProps) {
  const pointsEarned = prediction.points_earned;
  const multiplier = match.multiplier;

  // Determine badge variant and icon based on points
  let badgeVariant: "default" | "secondary" | "outline" = "outline";
  let PointIcon = Target;
  let badgeClass = "";

  if (pointsEarned === 3 * multiplier) {
    // Exact score
    badgeVariant = "default";
    PointIcon = Trophy;
    badgeClass = "bg-green-600 hover:bg-green-700 text-white";
  } else if (pointsEarned === 2 * multiplier) {
    // Correct difference
    badgeVariant = "secondary";
    PointIcon = TrendingUp;
    badgeClass = "bg-blue-600 hover:bg-blue-700 text-white";
  } else if (pointsEarned === 1 * multiplier) {
    // Correct winner
    badgeVariant = "secondary";
    PointIcon = Target;
    badgeClass = "bg-amber-600 hover:bg-amber-700 text-white";
  } else {
    // No points
    badgeClass = "bg-gray-500 hover:bg-gray-600 text-white";
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {formatLocalDateTime(match.match_date)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {multiplier > 1 && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-500">
                ×{multiplier}
              </Badge>
            )}
            <Badge variant={badgeVariant} className={`flex items-center gap-1 ${badgeClass}`}>
              <PointIcon className="h-3 w-3" />
              {pointsEarned} pts
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Result */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <TeamBadge team={match.home_team} size="sm" showName={true} />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-16 text-center font-bold text-lg">
                {match.home_score}
              </div>
              <span className="text-muted-foreground">:</span>
              <div className="w-16 text-center font-bold text-lg">
                {match.away_score}
              </div>
            </div>

            <div className="flex-1 flex justify-end">
              <TeamBadge team={match.away_team} size="sm" showName={true} />
            </div>
          </div>
          <div className="text-center text-xs font-medium text-muted-foreground">
            Final Score
          </div>
        </div>

        {/* User's Prediction */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-right text-sm text-muted-foreground">
              Your Prediction
            </div>

            <div className="flex items-center gap-2">
              <div className="w-16 text-center text-sm border rounded px-2 py-1 bg-muted/50">
                {prediction.predicted_home_score}
              </div>
              <span className="text-muted-foreground text-sm">:</span>
              <div className="w-16 text-center text-sm border rounded px-2 py-1 bg-muted/50">
                {prediction.predicted_away_score}
              </div>
            </div>

            <div className="flex-1">
              {/* Empty space for alignment */}
            </div>
          </div>
        </div>

        {/* Round info */}
        {match.round && (
          <div className="text-center text-sm text-muted-foreground">
            {match.round}
          </div>
        )}

        {/* Points explanation */}
        {pointsEarned > 0 && (
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            {pointsEarned === 3 * multiplier && "Exact score match!"}
            {pointsEarned === 2 * multiplier && "Correct score difference!"}
            {pointsEarned === 1 * multiplier && "Correct winner!"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
