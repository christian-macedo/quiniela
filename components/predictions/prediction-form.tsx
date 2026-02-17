"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MatchWithTeams } from "@/types/database";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatLocalDateTime, isPastDate } from "@/lib/utils/date";
import { Check, Lock } from "lucide-react";

interface PredictionFormProps {
  match: MatchWithTeams;
  existingPrediction?: {
    predicted_home_score: number;
    predicted_away_score: number;
  };
  onSubmit: (homeScore: number, awayScore: number) => Promise<void>;
}

export function PredictionForm({ match, existingPrediction, onSubmit }: PredictionFormProps) {
  const t = useTranslations("predictions");

  const [homeScore, setHomeScore] = useState(
    existingPrediction?.predicted_home_score?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    existingPrediction?.predicted_away_score?.toString() ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPastMatchDate = isPastDate(match.match_date);
  const isCompleted = match.status === "completed";
  const isLocked = isPastMatchDate || isCompleted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeScore || !awayScore || isLocked) return;

    setIsSubmitting(true);
    try {
      await onSubmit(parseInt(homeScore), parseInt(awayScore));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={isLocked ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{formatLocalDateTime(match.match_date)}</CardTitle>
          <div className="flex items-center gap-2">
            {match.round && (
              <Badge variant="outline" className="text-xs">
                {match.round}
              </Badge>
            )}
            {existingPrediction && !isLocked && (
              <Badge variant="outline" className="text-success border-success">
                <Check className="h-3 w-3 mr-1" />
                {t("form.predicted")}
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" />
                {t("form.locked")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <TeamBadge team={match.home_team} size="sm" showName={true} />
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="99"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                disabled={isLocked || isSubmitting}
                className="w-20 text-center text-2xl font-display font-bold bg-surface-sunken"
                placeholder="0"
              />
              <span className="text-muted-foreground font-bold">:</span>
              <Input
                type="number"
                min="0"
                max="99"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                disabled={isLocked || isSubmitting}
                className="w-20 text-center text-2xl font-display font-bold bg-surface-sunken"
                placeholder="0"
              />
            </div>

            <div className="flex-1 flex justify-end">
              <TeamBadge team={match.away_team} size="sm" showName={true} />
            </div>
          </div>
        </CardContent>
        {!isLocked && (
          <CardFooter>
            <Button
              type="submit"
              className="w-full transition-colors"
              disabled={!homeScore || !awayScore || isSubmitting}
            >
              {isSubmitting
                ? t("form.saving")
                : existingPrediction
                  ? t("form.updatePrediction")
                  : t("form.submitPrediction")}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
