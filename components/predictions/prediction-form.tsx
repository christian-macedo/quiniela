"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MatchWithTeams } from "@/types/database";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatLocalDateTime, isPastDate } from "@/lib/utils/date";

interface PredictionFormProps {
  match: MatchWithTeams;
  existingPrediction?: {
    predicted_home_score: number;
    predicted_away_score: number;
  };
  onSubmit: (homeScore: number, awayScore: number) => Promise<void>;
}

export function PredictionForm({ match, existingPrediction, onSubmit }: PredictionFormProps) {
  const t = useTranslations('messages');
  
  const [homeScore, setHomeScore] = useState(
    existingPrediction?.predicted_home_score?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    existingPrediction?.predicted_away_score?.toString() ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPastMatchDate = isPastDate(match.match_date);
  const isCompleted = match.status === "completed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(parseInt(homeScore), parseInt(awayScore));
      const message = existingPrediction 
        ? t('predictions.updateSuccess')
        : t('predictions.savedSuccess');
      toast.success(message);
    } catch {
      toast.error(t('predictions.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {formatLocalDateTime(match.match_date)}
        </CardTitle>
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
                disabled={isPastMatchDate || isCompleted || isSubmitting}
                className="w-16 text-center"
                placeholder="0"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="99"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                disabled={isPastMatchDate || isCompleted || isSubmitting}
                className="w-16 text-center"
                placeholder="0"
              />
            </div>

            <div className="flex-1 flex justify-end">
              <TeamBadge team={match.away_team} size="sm" showName={true} />
            </div>
          </div>

          {match.round && (
            <div className="text-center text-sm text-muted-foreground">
              {match.round}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={!homeScore || !awayScore || isPastMatchDate || isCompleted || isSubmitting}
          >
            {isSubmitting ? t('common.status.saving') : existingPrediction ? 'Actualizar Pronóstico' : 'Enviar Pronóstico'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
