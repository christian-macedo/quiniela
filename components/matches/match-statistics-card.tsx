"use client";

import { MatchWithTeams, Prediction } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

/* --------------------- Shared stacked-bar breakdown --------------------- */

interface ShareItem {
  key: string;
  /** Legend label for this segment. */
  label: string;
  /** Tailwind background class for the bar/swatch color. */
  colorClass: string;
  /** Integer percentage of the total (segments should sum to 100). */
  percentage: number;
  /** Raw number of predictions in this segment. */
  count: number;
}

/**
 * A stacked proportion bar followed by a legend showing each segment's label,
 * percentage, and prediction count. Shared by the Odds and Accuracy views.
 */
function ShareBreakdown({
  items,
  predictionsLabel,
}: {
  items: ShareItem[];
  predictionsLabel: (n: number) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {items.map((item) =>
          item.percentage > 0 ? (
            <div
              key={item.key}
              className={item.colorClass}
              style={{ width: `${item.percentage}%` }}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-sm ${item.colorClass}`} aria-hidden="true" />
            <span className="flex-1 truncate">{item.label}</span>
            <span className="font-display font-bold tabular-nums">{item.percentage}%</span>
            <span className="w-28 text-right text-sm text-muted-foreground tabular-nums">
              {predictionsLabel(item.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

/* --------------------------- Score distribution -------------------------- */

// Distinct slice colors (defined in globals.css for both light & dark themes).
const SLICE_COLOR_VARS = [
  "--chart-cat-1",
  "--chart-cat-2",
  "--chart-cat-3",
  "--chart-cat-4",
  "--chart-cat-5",
  "--chart-cat-6",
];
const OTHER_COLOR_VAR = "--chart-cat-other";

/** Show at most this many distinct slices; the remainder is grouped into "Other". */
const MAX_SLICES = 6;

interface DistributionSegment {
  label: string;
  count: number;
  percentage: number;
  isMostCommon: boolean;
  isOther: boolean;
  color: string;
}

function DistributionView({
  distribution,
  total,
  headers,
  mostCommonLabel,
  otherLabel,
  chartLabel,
  centerLabel,
}: {
  distribution: ReturnType<typeof computeScoreDistribution>;
  total: number;
  headers: { scoreline: string; count: string; share: string };
  mostCommonLabel: string;
  otherLabel: string;
  chartLabel: string;
  centerLabel: string;
}) {
  // Group the long tail so the donut stays readable.
  const segments: DistributionSegment[] = [];
  if (distribution.length <= MAX_SLICES) {
    distribution.forEach((e, i) => {
      segments.push({
        label: e.label,
        count: e.count,
        percentage: e.percentage,
        isMostCommon: e.isMostCommon,
        isOther: false,
        color: `hsl(var(${SLICE_COLOR_VARS[i]}))`,
      });
    });
  } else {
    const head = distribution.slice(0, MAX_SLICES - 1);
    const tail = distribution.slice(MAX_SLICES - 1);
    head.forEach((e, i) => {
      segments.push({
        label: e.label,
        count: e.count,
        percentage: e.percentage,
        isMostCommon: e.isMostCommon,
        isOther: false,
        color: `hsl(var(${SLICE_COLOR_VARS[i]}))`,
      });
    });
    const tailCount = tail.reduce((sum, e) => sum + e.count, 0);
    segments.push({
      label: otherLabel,
      count: tailCount,
      percentage: total > 0 ? Math.round((tailCount / total) * 100) : 0,
      isMostCommon: false,
      isOther: true,
      color: `hsl(var(${OTHER_COLOR_VAR}))`,
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <DonutChart
        segments={segments}
        total={total}
        centerLabel={centerLabel}
        ariaLabel={chartLabel}
      />

      {/* Accessible data table doubling as the chart legend. */}
      <table className="w-full text-sm sm:flex-1">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th scope="col" className="py-2 text-left font-medium">
              {headers.scoreline}
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {headers.count}
            </th>
            <th scope="col" className="py-2 pr-1 text-right font-medium">
              {headers.share}
            </th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => (
            <tr key={seg.label} className="border-b last:border-0">
              <th scope="row" className="py-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      seg.isOther ? "text-muted-foreground" : "font-display font-bold tabular-nums"
                    }
                  >
                    {seg.label}
                  </span>
                  {seg.isMostCommon && (
                    <Badge variant="secondary" className="text-xs">
                      {mostCommonLabel}
                    </Badge>
                  )}
                </span>
              </th>
              <td className="py-2 text-right tabular-nums">{seg.count}</td>
              <td className="py-2 pr-1 text-right tabular-nums text-muted-foreground">
                {seg.percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DonutChart({
  segments,
  total,
  centerLabel,
  ariaLabel,
}: {
  segments: DistributionSegment[];
  total: number;
  centerLabel: string;
  ariaLabel: string;
}) {
  const size = 168;
  const stroke = 30;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Hairline gap (in user units) between adjacent slices for legibility.
  const gap = segments.length > 1 ? 2 : 0;

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={ariaLabel}
        // Rotate so the first slice starts at 12 o'clock.
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {segments.map((seg) => {
          const fraction = total > 0 ? seg.count / total : 0;
          const dash = Math.max(fraction * circumference - gap, 0);
          const circle = (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += fraction * circumference;
          return circle;
        })}
      </svg>
      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
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
