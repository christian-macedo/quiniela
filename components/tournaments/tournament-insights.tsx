"use client";

import { useTranslations } from "next-intl";
import {
  MatchWithTeams,
  Team,
  RankingWithPublicUser,
  BreakdownWithPublicUser,
} from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamBadge } from "@/components/teams/team-badge";
import { ShareBreakdown, type ShareItem } from "@/components/stats/share-breakdown";
import { DistributionView } from "@/components/stats/distribution-view";
import { DonutChart, type DonutSegment } from "@/components/stats/donut-chart";
import { distributePercentages, type Outcome } from "@/lib/utils/match-stats";
import {
  computeOverviewKpis,
  computeTournamentAccuracy,
  computeCrowdCalledRate,
  computeOutcomeBias,
  computeTeamSuperlatives,
  type MatchStatGroup,
  type TeamStat,
} from "@/lib/utils/tournament-stats";
import { getPublicUserDisplay, getPublicUserInitials } from "@/lib/utils/privacy";
import { BarChart3, Crown, TrendingDown, Eye, Coins, CheckCircle2, Info } from "lucide-react";

type Group = MatchStatGroup<MatchWithTeams>;

interface TournamentInsightsProps {
  completed: Group[];
  totals: {
    participantCount: number;
    totalMatches: number;
    predictionsSubmitted: number;
    totalPointsAwarded: number;
  };
  rankings: RankingWithPublicUser[];
  breakdown: BreakdownWithPublicUser[];
}

export function TournamentInsights({
  completed,
  totals,
  rankings,
  breakdown,
}: TournamentInsightsProps) {
  const t = useTranslations("insights");

  const kpis = computeOverviewKpis({ ...totals, completed });

  if (completed.length === 0) {
    return (
      <div className="space-y-8">
        <ScopeNote t={t} />
        <KpiRow kpis={kpis} t={t} />
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3
              className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("empty.description")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ScopeNote t={t} />
      <KpiRow kpis={kpis} t={t} />

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="accuracy">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="accuracy">{t("tabs.accuracy")}</TabsTrigger>
              <TabsTrigger value="results">{t("tabs.results")}</TabsTrigger>
              <TabsTrigger value="teams">{t("tabs.teams")}</TabsTrigger>
              <TabsTrigger value="awards">{t("tabs.awards")}</TabsTrigger>
            </TabsList>

            <TabsContent value="accuracy" className="pt-6">
              <AccuracyTab completed={completed} t={t} />
            </TabsContent>
            <TabsContent value="results" className="pt-6">
              <ResultsTab completed={completed} t={t} />
            </TabsContent>
            <TabsContent value="teams" className="pt-6">
              <TeamsTab completed={completed} t={t} />
            </TabsContent>
            <TabsContent value="awards" className="pt-6">
              <AwardsTab rankings={rankings} breakdown={breakdown} t={t} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

/* -------------------------------- Scope note ------------------------------ */

function ScopeNote({ t }: { t: T }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t("scopeNote")}
    </p>
  );
}

/* --------------------------------- KPI row -------------------------------- */

function KpiRow({ kpis, t }: { kpis: ReturnType<typeof computeOverviewKpis>; t: T }) {
  const cells: { label: string; value: string }[] = [
    { label: t("kpi.participants"), value: String(kpis.participantCount) },
    { label: t("kpi.predictions"), value: String(kpis.predictionsSubmitted) },
    {
      label: t("kpi.matchesScored"),
      value: `${kpis.completedMatches}/${kpis.totalMatches}`,
    },
    { label: t("kpi.totalPoints"), value: String(kpis.totalPointsAwarded) },
    { label: t("kpi.avgPoints"), value: String(kpis.avgPointsPerPrediction) },
    { label: t("kpi.exactRate"), value: `${kpis.exactRate}%` },
  ];

  return (
    <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-accent/5 border-primary/20">
      <CardContent className="pt-6">
        <dl className="grid grid-cols-2 gap-4 text-center sm:grid-cols-3 lg:grid-cols-6">
          {cells.map((cell) => (
            <div key={cell.label}>
              <dd className="font-display text-3xl font-bold tabular-nums">{cell.value}</dd>
              <dt className="text-sm text-muted-foreground">{cell.label}</dt>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Accuracy tab ----------------------------- */

function AccuracyTab({ completed, t }: { completed: Group[]; t: T }) {
  const accuracy = computeTournamentAccuracy(completed);
  const crowd = computeCrowdCalledRate(completed);

  const counts = [accuracy.exact, accuracy.winnerDiff, accuracy.winnerOnly, accuracy.miss];
  const [exactPct, winnerDiffPct, winnerOnlyPct, missPct] = distributePercentages(counts);
  const items: ShareItem[] = [
    {
      key: "exact",
      label: t("accuracy.exact"),
      colorClass: "bg-success",
      percentage: exactPct,
      count: accuracy.exact,
    },
    {
      key: "winnerDiff",
      label: t("accuracy.winnerDiff"),
      colorClass: "bg-info",
      percentage: winnerDiffPct,
      count: accuracy.winnerDiff,
    },
    {
      key: "winnerOnly",
      label: t("accuracy.winnerOnly"),
      colorClass: "bg-warning",
      percentage: winnerOnlyPct,
      count: accuracy.winnerOnly,
    },
    {
      key: "miss",
      label: t("accuracy.miss"),
      colorClass: "bg-muted-foreground",
      percentage: missPct,
      count: accuracy.miss,
    },
  ];

  return (
    <div className="space-y-6">
      <ShareBreakdown items={items} predictionsLabel={(n) => t("predictions", { count: n })} />

      <div
        role="status"
        className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-success"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">
          {t("accuracy.crowdCalled", {
            percentage: crowd.percentage,
            called: crowd.called,
            total: crowd.total,
          })}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Results tab ----------------------------- */

// Consistent home/draw/away colors, shared by both donuts and the legend.
const OUTCOMES: Outcome[] = ["home", "draw", "away"];
const OUTCOME_COLORS: Record<Outcome, string> = {
  home: "hsl(var(--success))",
  draw: "hsl(var(--muted-foreground))",
  away: "hsl(var(--accent))",
};

function ResultsTab({ completed, t }: { completed: Group[]; t: T }) {
  const bias = computeOutcomeBias(completed);

  const donutSegments = (counts: Record<Outcome, number>): DonutSegment[] =>
    OUTCOMES.map((o) => ({ label: o, count: counts[o], color: OUTCOME_COLORS[o] }));

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="font-display text-lg font-bold">{t("results.outcomesTitle")}</h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <figure className="flex flex-col items-center gap-2">
            <figcaption className="text-sm font-medium text-muted-foreground">
              {t("results.actualTitle")}
            </figcaption>
            <DonutChart
              segments={donutSegments(bias.actual.counts)}
              total={bias.actual.total}
              centerLabel={t("results.totalShort")}
              ariaLabel={t("results.actualTitle")}
            />
          </figure>
          <figure className="flex flex-col items-center gap-2">
            <figcaption className="text-sm font-medium text-muted-foreground">
              {t("results.predictedTitle")}
            </figcaption>
            <DonutChart
              segments={donutSegments(bias.predicted.counts)}
              total={bias.predicted.total}
              centerLabel={t("results.predictionsShort")}
              ariaLabel={t("results.predictedTitle")}
            />
          </figure>
        </div>

        {/* Single shared legend, doubling as an actual-vs-predicted comparison. */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th scope="col" className="py-2 text-left font-medium">
                {t("results.outcome")}
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {t("results.actual")}
              </th>
              <th scope="col" className="py-2 pr-1 text-right font-medium">
                {t("results.predicted")}
              </th>
            </tr>
          </thead>
          <tbody>
            {OUTCOMES.map((o) => (
              <tr key={o} className="border-b last:border-0">
                <th scope="row" className="py-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: OUTCOME_COLORS[o] }}
                      aria-hidden="true"
                    />
                    {t(`results.${o}`)}
                  </span>
                </th>
                <td className="py-2 text-right tabular-nums">
                  {bias.actual.counts[o]} ({bias.actual.percentages[o]}%)
                </td>
                <td className="py-2 pr-1 text-right tabular-nums">
                  {bias.predicted.counts[o]} ({bias.predicted.percentages[o]}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">{t("results.avgGoalsTitle")}</h3>
        <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/30 p-6 text-center">
          <AvgGoalCell
            label={t("results.goalsHome")}
            predicted={bias.avgGoals.predictedHome}
            actual={bias.avgGoals.actualHome}
            t={t}
          />
          <AvgGoalCell
            label={t("results.goalsAway")}
            predicted={bias.avgGoals.predictedAway}
            actual={bias.avgGoals.actualAway}
            t={t}
          />
          <AvgGoalCell
            label={t("results.goalsTotal")}
            predicted={bias.avgGoals.predictedTotal}
            actual={bias.avgGoals.actualTotal}
            t={t}
          />
        </div>
      </section>

      {bias.scorelines.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold">{t("results.scorelinesTitle")}</h3>
          <DistributionView
            distribution={bias.scorelines}
            total={bias.actual.total}
            headers={{
              scoreline: t("results.scoreline"),
              count: t("results.count"),
              share: t("results.share"),
            }}
            mostCommonLabel={t("results.mostCommon")}
            otherLabel={t("results.other")}
            chartLabel={t("results.chartLabel")}
            centerLabel={t("results.totalShort")}
          />
        </section>
      )}
    </div>
  );
}

function AvgGoalCell({
  label,
  predicted,
  actual,
  t,
}: {
  label: string;
  predicted: number;
  actual: number;
  t: T;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{actual}</p>
      <p className="text-xs text-muted-foreground">{t("results.actual")}</p>
      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
        {t("results.predicted")}: {predicted}
      </p>
    </div>
  );
}

/* --------------------------------- Teams tab ------------------------------ */

function TeamsTab({ completed, t }: { completed: Group[]; t: T }) {
  const { underdogs, safeBets, topScorers, nappers } = computeTeamSuperlatives(completed);

  const sections: {
    key: string;
    title: string;
    description: string;
    teams: TeamStat<Team>[];
    format: (value: number) => string;
  }[] = [
    {
      key: "underdogs",
      title: t("teams.underdogsTitle"),
      description: t("teams.underdogsDescription"),
      teams: underdogs,
      format: (value) => t("teams.upsetsValue", { count: value }),
    },
    {
      key: "safeBets",
      title: t("teams.safeBetsTitle"),
      description: t("teams.safeBetsDescription"),
      teams: safeBets,
      format: (value) => t("teams.accuracyValue", { percentage: value }),
    },
    {
      key: "topScorers",
      title: t("teams.topScorersTitle"),
      description: t("teams.topScorersDescription"),
      teams: topScorers,
      format: (value) => t("teams.goalsValue", { count: value }),
    },
    {
      key: "nappers",
      title: t("teams.nappersTitle"),
      description: t("teams.nappersDescription"),
      teams: nappers,
      format: (value) => t("teams.drawsValue", { count: value }),
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <TeamList key={section.key} title={section.title} description={section.description}>
          {section.teams.length === 0 ? (
            <EmptyRow label={t("teams.none")} />
          ) : (
            section.teams.map((entry) => (
              <li key={entry.team.id} className="flex items-center gap-3 rounded-lg border p-3">
                <TeamBadge team={entry.team} size="sm" className="flex-1" />
                <Badge variant="secondary" className="shrink-0">
                  {section.format(entry.value)}
                </Badge>
              </li>
            ))
          )}
        </TeamList>
      ))}
    </div>
  );
}

function TeamList({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <li className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{label}</li>
  );
}

/* --------------------------------- Awards tab ----------------------------- */

function AwardsTab({
  rankings,
  breakdown,
  t,
}: {
  rankings: RankingWithPublicUser[];
  breakdown: BreakdownWithPublicUser[];
  t: T;
}) {
  const awards = computeAwards(rankings, breakdown, t);

  if (awards.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("teams.none")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {awards.map((a) => (
        <div key={a.key} className="flex items-center gap-4 rounded-lg border p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {a.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{a.title}</p>
            {a.player ? (
              <div className="mt-1 flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={a.player.avatarUrl ?? undefined} />
                  <AvatarFallback>{a.player.initials}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{a.player.name}</span>
              </div>
            ) : (
              <p className="mt-1 font-medium italic text-muted-foreground">
                {t("awards.stillAtPlay")}
              </p>
            )}
          </div>
          {a.player && a.value && (
            <span className="shrink-0 font-display text-xl font-bold tabular-nums">{a.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

interface Award {
  key: string;
  icon: React.ReactNode;
  title: string;
  /** Resolved recipient, or null when the standing is tied / undecided. */
  player: { name: string; initials: string; avatarUrl: string | null } | null;
  /** Stat shown on the right; hidden when the award is undecided. */
  value?: string;
}

function computeAwards(
  rankings: RankingWithPublicUser[],
  breakdown: BreakdownWithPublicUser[],
  t: T
): Award[] {
  // Join each ranked player with their prediction breakdown counts.
  const countsByUser = new Map(breakdown.map((b) => [b.user_id, b]));
  const players = rankings.map((r) => {
    const b = countsByUser.get(r.user_id);
    const exact = b?.exact_count ?? 0;
    const goalDiff = b?.goal_diff_count ?? 0;
    const winner = b?.winner_count ?? 0;
    return {
      user: r.user,
      points: r.total_points,
      exact,
      goalDiff,
      winner,
      correct: exact + goalDiff + winner,
      avgPoints: r.predictions_count > 0 ? r.total_points / r.predictions_count : 0,
    };
  });

  if (players.length === 0) return [];

  type P = (typeof players)[number];

  // Leaderboard order: points, then exact, then winner+difference, then winner.
  const byStanding = (a: P, b: P) =>
    b.points - a.points || b.exact - a.exact || b.goalDiff - a.goalDiff || b.winner - a.winner;

  // The unique extreme under cmp, or null when the top two are perfectly tied.
  const pickUnique = (cmp: (a: P, b: P) => number): P | null => {
    const sorted = [...players].sort(cmp);
    if (sorted.length > 1 && cmp(sorted[0], sorted[1]) === 0) return null;
    return sorted[0];
  };

  const toPlayer = (p: P | null) =>
    p
      ? {
          name: getPublicUserDisplay(p.user),
          initials: getPublicUserInitials(p.user),
          avatarUrl: p.user.avatar_url,
        }
      : null;

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const leader = pickUnique(byStanding);
  const bottom = pickUnique((a, b) => byStanding(b, a)); // exact opposite of the leader
  const clairvoyant = pickUnique((a, b) => b.correct - a.correct);
  const highEarner = pickUnique((a, b) => b.avgPoints - a.avgPoints);

  return [
    {
      key: "leader",
      icon: <Crown className="h-5 w-5" aria-hidden="true" />,
      title: t("awards.leader"),
      player: toPlayer(leader),
      value: leader ? t("awards.pointsValue", { points: leader.points }) : undefined,
    },
    {
      key: "bottom",
      icon: <TrendingDown className="h-5 w-5" aria-hidden="true" />,
      title: t("awards.bottom"),
      player: toPlayer(bottom),
      value: bottom ? t("awards.pointsValue", { points: bottom.points }) : undefined,
    },
    {
      key: "clairvoyant",
      icon: <Eye className="h-5 w-5" aria-hidden="true" />,
      title: t("awards.clairvoyant"),
      player: toPlayer(clairvoyant),
      value: clairvoyant ? t("awards.correctValue", { count: clairvoyant.correct }) : undefined,
    },
    {
      key: "highEarner",
      icon: <Coins className="h-5 w-5" aria-hidden="true" />,
      title: t("awards.highEarner"),
      player: toPlayer(highEarner),
      value: highEarner
        ? t("awards.avgValue", { points: round1(highEarner.avgPoints) })
        : undefined,
    },
  ];
}
