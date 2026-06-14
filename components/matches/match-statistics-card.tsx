"use client";

import { MatchWithTeams, Prediction } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  computeOutcomeOdds,
  computeScoreDistribution,
  computeConsensus,
  computeAccuracyBreakdown,
  getConsensusOutcome,
  outcomeOf,
  distributePercentages,
  type AccuracyBreakdown,
} from "@/lib/utils/match-stats";
import { ShareBreakdown, type ShareItem } from "@/components/stats/share-breakdown";
import { DistributionView } from "@/components/stats/distribution-view";
import { BarChart3, CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface MatchStatisticsCardProps {
  match: MatchWithTeams;
  predictions: Pick<Prediction, "predicted_home_score" | "predicted_away_score">[];
}

export function MatchStatisticsCard({ match, predictions }: MatchStatisticsCardProps) {
  const t = useTranslations("matches.statistics");

  const odds = computeOutcomeOdds(predictions);
  const distribution = computeScoreDistribution(predictions);
  const consensus = computeConsensus(predictions);
  const accuracy = computeAccuracyBreakdown(predictions, match);

  const homeLabel = match.home_team.short_name;
  const awayLabel = match.away_team.short_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="odds">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="odds">{t("tabs.odds")}</TabsTrigger>
            <TabsTrigger value="distribution">{t("tabs.distribution")}</TabsTrigger>
            <TabsTrigger value="consensus">{t("tabs.consensus")}</TabsTrigger>
            {accuracy && <TabsTrigger value="accuracy">{t("tabs.accuracy")}</TabsTrigger>}
          </TabsList>

          {/* Outcome odds */}
          <TabsContent value="odds" className="pt-4">
            <ShareBreakdown
              items={[
                {
                  key: "home",
                  label: t("outcome.homeWins", { team: match.home_team.name }),
                  colorClass: "bg-success",
                  percentage: odds.percentages.home,
                  count: odds.counts.home,
                },
                {
                  key: "draw",
                  label: t("outcome.draw"),
                  colorClass: "bg-muted-foreground",
                  percentage: odds.percentages.draw,
                  count: odds.counts.draw,
                },
                {
                  key: "away",
                  label: t("outcome.awayWins", { team: match.away_team.name }),
                  colorClass: "bg-accent",
                  percentage: odds.percentages.away,
                  count: odds.counts.away,
                },
              ]}
              predictionsLabel={(n) => t("predictions", { count: n })}
            />
          </TabsContent>

          {/* Scoreline distribution */}
          <TabsContent value="distribution" className="pt-4">
            <DistributionView
              distribution={distribution}
              total={predictions.length}
              headers={{
                scoreline: t("distribution.scoreline"),
                count: t("distribution.count"),
                share: t("distribution.share"),
              }}
              mostCommonLabel={t("distribution.mostCommon")}
              otherLabel={t("distribution.other")}
              chartLabel={t("distribution.chartLabel")}
              centerLabel={t("distribution.totalShort")}
            />
          </TabsContent>

          {/* Crowd consensus */}
          <TabsContent value="consensus" className="pt-4">
            <ConsensusView
              consensus={consensus}
              odds={odds}
              match={match}
              homeLabel={homeLabel}
              awayLabel={awayLabel}
              t={t}
            />
          </TabsContent>

          {/* Accuracy breakdown (completed only) */}
          {accuracy && (
            <TabsContent value="accuracy" className="pt-4">
              <ShareBreakdown
                items={buildAccuracyItems(accuracy, {
                  exact: t("accuracy.exact"),
                  winnerDiff: t("accuracy.winnerDiff"),
                  winnerOnly: t("accuracy.winnerOnly"),
                  miss: t("accuracy.miss"),
                })}
                predictionsLabel={(n) => t("predictions", { count: n })}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* --------------------- Accuracy view segments --------------------- */

/** Build the Accuracy view segments, with percentages that sum to exactly 100. */
function buildAccuracyItems(
  accuracy: AccuracyBreakdown,
  labels: { exact: string; winnerDiff: string; winnerOnly: string; miss: string }
): ShareItem[] {
  const counts = [accuracy.exact, accuracy.winnerDiff, accuracy.winnerOnly, accuracy.miss];
  const [exactPct, winnerDiffPct, winnerOnlyPct, missPct] = distributePercentages(counts);

  return [
    {
      key: "exact",
      label: labels.exact,
      colorClass: "bg-success",
      percentage: exactPct,
      count: accuracy.exact,
    },
    {
      key: "winnerDiff",
      label: labels.winnerDiff,
      colorClass: "bg-info",
      percentage: winnerDiffPct,
      count: accuracy.winnerDiff,
    },
    {
      key: "winnerOnly",
      label: labels.winnerOnly,
      colorClass: "bg-warning",
      percentage: winnerOnlyPct,
      count: accuracy.winnerOnly,
    },
    {
      key: "miss",
      label: labels.miss,
      colorClass: "bg-muted-foreground",
      percentage: missPct,
      count: accuracy.miss,
    },
  ];
}

/* ----------------------------- Crowd consensus --------------------------- */

function ConsensusView({
  consensus,
  odds,
  match,
  homeLabel,
  awayLabel,
  t,
}: {
  consensus: ReturnType<typeof computeConsensus>;
  odds: ReturnType<typeof computeOutcomeOdds>;
  match: MatchWithTeams;
  homeLabel: string;
  awayLabel: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const consensusOutcome = getConsensusOutcome(odds);
  const hasResult = match.home_score !== null && match.away_score !== null;
  const actualOutcome = hasResult
    ? outcomeOf(match.home_score as number, match.away_score as number)
    : null;
  const crowdCalledIt =
    consensusOutcome !== null && actualOutcome !== null && consensusOutcome === actualOutcome;

  return (
    <div className="space-y-4">
      {/* Average scoreline readout */}
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">{t("consensus.crowdPredicts")}</p>
        <div className="mt-2 flex items-center justify-center gap-3 font-display text-4xl font-bold">
          <span className="text-sm font-medium text-muted-foreground">{homeLabel}</span>
          <span className="tabular-nums">{consensus.avgHome}</span>
          <span className="text-muted-foreground">:</span>
          <span className="tabular-nums">{consensus.avgAway}</span>
          <span className="text-sm font-medium text-muted-foreground">{awayLabel}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("consensus.avgTotalGoals", { goals: consensus.avgTotalGoals })}
        </p>
      </div>

      {/* Consensus vs result (completed matches) */}
      {hasResult && consensusOutcome !== null && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            crowdCalledIt
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          {crowdCalledIt ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <p className="text-sm font-medium">
            {crowdCalledIt ? t("consensus.calledIt") : t("consensus.gotItWrong")}
          </p>
        </div>
      )}
    </div>
  );
}
