"use client";

import { MatchWithTeams, Prediction, User } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDateTime } from "@/lib/utils/date";
import { useTranslations } from 'next-intl';

interface PredictionWithUser extends Prediction {
  user: Pick<User, "id" | "screen_name" | "avatar_url">;
}

interface MatchDetailViewProps {
  match: MatchWithTeams;
  predictions: PredictionWithUser[];
  currentUserId: string;
}

export function MatchDetailView({
  match,
  predictions,
  currentUserId,
}: MatchDetailViewProps) {
  const t = useTranslations('matches');
  const tCommon = useTranslations('common');
  const isCompleted = match.status === "completed";
  const isLive = match.status === "in_progress";
  const isCancelled = match.status === "cancelled";

  const getStatusColor = () => {
    switch (match.status) {
      case "completed":
        return "bg-blue-500";
      case "in_progress":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "";
    }
  };

  // Sort predictions: current user first, then alphabetically by screen_name
  const sortedPredictions = [...predictions].sort((a, b) => {
    if (a.user.id === currentUserId) return -1;
    if (b.user.id === currentUserId) return 1;
    return (a.user.screen_name || "").localeCompare(b.user.screen_name || "");
  });

  return (
    <div className="space-y-6">
      {/* Match Summary Card */}
      <Card className={isLive ? "border-green-500 border-2" : ""}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Badge
              variant={isLive || isCompleted ? "default" : "outline"}
              className={getStatusColor()}
            >
              {t(`status.${match.status}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teams and Score */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex justify-center">
              <TeamBadge team={match.home_team} size="lg" showName={true} />
            </div>

            {isCompleted &&
            match.home_score !== null &&
            match.away_score !== null ? (
              <div className="flex items-center gap-4 text-4xl font-bold">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">:</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="text-2xl font-semibold text-muted-foreground">
                {tCommon('vs')}
              </div>
            )}

            <div className="flex-1 flex justify-center">
              <TeamBadge team={match.away_team} size="lg" showName={true} />
            </div>
          </div>

          {/* Match Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('details.dateTime')}</p>
              <p className="font-medium">
                {formatLocalDateTime(match.match_date)}
              </p>
            </div>
            {match.round && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('details.round')}</p>
                <p className="font-medium">{match.round}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('details.multiplier')}</p>
              <p className="font-medium text-lg">
                {match.multiplier > 1 ? (
                  <span className="text-orange-500">{match.multiplier}x</span>
                ) : (
                  `${match.multiplier}x`
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('details.totalPredictions')}</p>
              <p className="font-medium">{predictions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictions Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('details.predictions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('details.noPredictions')}
            </p>
          ) : (
            <div className="space-y-3">
              {sortedPredictions.map((prediction) => (
                <PredictionRow
                  key={prediction.id}
                  prediction={prediction}
                  isCompleted={isCompleted}
                  isCancelled={isCancelled}
                  isCurrentUser={prediction.user.id === currentUserId}
                  match={match}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Info Card */}
      {match.multiplier > 1 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <span className="text-lg">⚡</span>
              <p className="text-sm">
                {t('details.multiplierNote', { multiplier: match.multiplier })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PredictionRowProps {
  prediction: PredictionWithUser;
  isCompleted: boolean;
  isCancelled: boolean;
  isCurrentUser: boolean;
  match: MatchWithTeams;
}

function PredictionRow({
  prediction,
  isCompleted,
  isCancelled,
  isCurrentUser,
  match,
}: PredictionRowProps) {
  const t = useTranslations('matches.details');
  const tCommon = useTranslations('common');
  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const showPrediction = isCompleted || isCancelled || isCurrentUser;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isCurrentUser
          ? "bg-primary/10 border border-primary/20"
          : "bg-muted/50"
      }`}
    >
      {/* User Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={prediction.user.avatar_url || undefined}
            alt={prediction.user.screen_name || "User"}
          />
          <AvatarFallback>
            {getInitials(prediction.user.screen_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {prediction.user.screen_name || t('anonymous')}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-primary">{t('you')}</span>
            )}
          </p>
        </div>
      </div>

      {/* Prediction Score or Hidden */}
      <div className="flex items-center gap-4">
        {showPrediction ? (
          <>
            <div className="text-center">
              <p className="text-lg font-bold">
                {prediction.predicted_home_score} :{" "}
                {prediction.predicted_away_score}
              </p>
            </div>
            {isCompleted && !isCancelled && (
              <div className="text-center min-w-[60px]">
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
                  {prediction.points_earned} {tCommon('labels.pts')}
                </Badge>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <span className="text-muted-foreground italic text-sm">
              {t('hiddenUntilEnd')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
