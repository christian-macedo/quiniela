"use client";

import { useTranslations } from "next-intl";
import {
  PublicUserProfile,
  PredictionWithMatch,
  MatchWithTeams,
} from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/teams/team-badge";
import { formatLocalDateTime } from "@/lib/utils/date";
import { getPublicUserDisplay, getPublicUserInitials } from "@/lib/utils/privacy";
import { computeHeadToHead } from "@/lib/utils/head-to-head";

/** A participant's summary stats sourced from the leaderboard + breakdown. */
export interface ComparisonSide {
  user: PublicUserProfile;
  rank: number | null;
  totalPoints: number;
  exactCount: number;
  goalDiffCount: number;
  winnerCount: number;
  predictions: PredictionWithMatch[];
}

interface ComparisonViewProps {
  you: ComparisonSide;
  opponent: ComparisonSide;
}

/** Per-completed-match row joining both users' predictions by match. */
interface ComparisonRow {
  match: MatchWithTeams;
  yourPrediction: PredictionWithMatch | null;
  opponentPrediction: PredictionWithMatch | null;
}

export function ComparisonView({ you, opponent }: ComparisonViewProps) {
  const t = useTranslations("rankings.compare");
  const tCommon = useTranslations("common");

  const headToHead = computeHeadToHead(you.predictions, opponent.predictions);

  // Build a per-match join over every completed match either user predicted.
  const rowsByMatch = new Map<string, ComparisonRow>();
  for (const prediction of [...you.predictions, ...opponent.predictions]) {
    if (prediction.match.status !== "completed") continue;
    if (!rowsByMatch.has(prediction.match_id)) {
      rowsByMatch.set(prediction.match_id, {
        match: prediction.match,
        yourPrediction: null,
        opponentPrediction: null,
      });
    }
  }
  for (const prediction of you.predictions) {
    const row = rowsByMatch.get(prediction.match_id);
    if (row) row.yourPrediction = prediction;
  }
  for (const prediction of opponent.predictions) {
    const row = rowsByMatch.get(prediction.match_id);
    if (row) row.opponentPrediction = prediction;
  }

  const rows = Array.from(rowsByMatch.values()).sort(
    (a, b) => new Date(b.match.match_date).getTime() - new Date(a.match.match_date).getTime()
  );

  const youName = getPublicUserDisplay(you.user);
  const opponentName = getPublicUserDisplay(opponent.user);

  return (
    <div className="space-y-6">
      {/* Summary stats, side by side */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard side={you} isYou />
        <SummaryCard side={opponent} />
      </div>

      {/* Head-to-head tally */}
      <Card>
        <CardHeader>
          <CardTitle>{t("headToHead.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {headToHead.total === 0 ? (
            <p className="text-sm text-muted-foreground">{t("headToHead.empty")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {headToHead.youWon}
                </p>
                <p className="text-sm text-muted-foreground">{t("headToHead.youWon")}</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-muted-foreground">{headToHead.ties}</p>
                <p className="text-sm text-muted-foreground">{t("headToHead.ties")}</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{headToHead.opponentWon}</p>
                <p className="text-sm text-muted-foreground">{t("headToHead.opponentWon")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match-by-match (completed only) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("matchByMatch.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("matchByMatch.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="py-2 pr-2 font-medium">
                      {t("matchByMatch.match")}
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-medium">
                      {t("matchByMatch.result")}
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-medium">
                      {youName}
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-medium">
                      {opponentName}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.match.id} className="border-b last:border-0">
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <TeamBadge team={row.match.home_team} size="sm" showName={false} />
                          <span className="text-xs text-muted-foreground">{tCommon("vs")}</span>
                          <TeamBadge team={row.match.away_team} size="sm" showName={false} />
                          {row.match.multiplier > 1 && (
                            <Badge
                              variant="outline"
                              className="border-orange-500 text-orange-500"
                            >
                              {row.match.multiplier}x
                            </Badge>
                          )}
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatLocalDateTime(row.match.match_date)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center font-semibold whitespace-nowrap">
                        {row.match.home_score} : {row.match.away_score}
                      </td>
                      <PredictionCell prediction={row.yourPrediction} match={row.match} />
                      <PredictionCell prediction={row.opponentPrediction} match={row.match} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ side, isYou = false }: { side: ComparisonSide; isYou?: boolean }) {
  const t = useTranslations("rankings");
  const tCompare = useTranslations("rankings.compare");
  const tCommon = useTranslations("common");

  return (
    <Card className={isYou ? "ring-2 ring-primary/30" : undefined}>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={side.user.avatar_url ?? undefined}
              alt={getPublicUserDisplay(side.user)}
            />
            <AvatarFallback>{getPublicUserInitials(side.user)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{getPublicUserDisplay(side.user)}</p>
            {isYou && (
              <span className="text-xs text-muted-foreground">{tCompare("you")}</span>
            )}
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <StatRow label={t("rank")} value={side.rank != null ? `#${side.rank}` : "—"} />
          <StatRow label={tCommon("labels.points")} value={side.totalPoints} />
          <StatRow label={t("breakdown.exact")} value={side.exactCount} />
          <StatRow label={t("breakdown.goalDiff")} value={side.goalDiffCount} />
          <StatRow label={t("breakdown.winner")} value={side.winnerCount} />
        </dl>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function PredictionCell({
  prediction,
  match,
}: {
  prediction: PredictionWithMatch | null;
  match: MatchWithTeams;
}) {
  if (!prediction) {
    return <td className="px-2 py-3 text-center text-muted-foreground">—</td>;
  }

  const pointsClass =
    prediction.points_earned >= 3 * match.multiplier
      ? "bg-green-500"
      : prediction.points_earned > 0
        ? "bg-blue-500"
        : "";

  return (
    <td className="px-2 py-3 text-center">
      <div className="font-medium whitespace-nowrap">
        {prediction.predicted_home_score} : {prediction.predicted_away_score}
      </div>
      <Badge
        variant={prediction.points_earned > 0 ? "default" : "outline"}
        className={`mt-1 ${pointsClass}`}
      >
        {prediction.points_earned}
      </Badge>
    </td>
  );
}
