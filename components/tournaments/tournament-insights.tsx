"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  MatchWithTeams,
  RankingWithPublicUser,
  BreakdownWithPublicUser,
  PublicUserProfile,
} from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareBreakdown, type ShareItem } from "@/components/stats/share-breakdown";
import { DistributionView } from "@/components/stats/distribution-view";
import { DonutChart, type DonutSegment } from "@/components/stats/donut-chart";
import { distributePercentages, type Outcome } from "@/lib/utils/match-stats";
import {
  computeOverviewKpis,
  computeTournamentAccuracy,
  computeCrowdCalledRate,
  computeOutcomeBias,
  computeMatchSuperlatives,
  type MatchStatGroup,
} from "@/lib/utils/tournament-stats";
import { getPublicUserDisplay, getPublicUserInitials } from "@/lib/utils/privacy";
import { BarChart3, Crown, Target, Percent, ListChecks, CheckCircle2 } from "lucide-react";

type Group = MatchStatGroup<MatchWithTeams>;

interface TournamentInsightsProps {
  tournamentId: string;
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
  tournamentId,
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
      <KpiRow kpis={kpis} t={t} />

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="accuracy">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="accuracy">{t("tabs.accuracy")}</TabsTrigger>
              <TabsTrigger value="results">{t("tabs.results")}</TabsTrigger>
              <TabsTrigger value="matches">{t("tabs.matches")}</TabsTrigger>
              <TabsTrigger value="awards">{t("tabs.awards")}</TabsTrigger>
            </TabsList>

            <TabsContent value="accuracy" className="pt-6">
              <AccuracyTab completed={completed} t={t} />
            </TabsContent>
            <TabsContent value="results" className="pt-6">
              <ResultsTab completed={completed} t={t} />
            </TabsContent>
            <TabsContent value="matches" className="pt-6">
              <MatchesTab completed={completed} tournamentId={tournamentId} t={t} />
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

/* -------------------------------- Matches tab ----------------------------- */

function MatchesTab({
  completed,
  tournamentId,
  t,
}: {
  completed: Group[];
  tournamentId: string;
  t: T;
}) {
  const { hardest, bestCalled, upsets } = computeMatchSuperlatives(completed);

  const matchLabel = (m: MatchWithTeams) =>
    `${m.home_team.short_name} ${m.home_score}–${m.away_score} ${m.away_team.short_name}`;

  return (
    <div className="space-y-8">
      <MatchList title={t("matches.upsetsTitle")}>
        {upsets.length === 0 ? (
          <EmptyRow label={t("matches.none")} />
        ) : (
          upsets.map((u) => {
            const favored =
              u.consensusOutcome === "home"
                ? u.match.home_team.short_name
                : u.consensusOutcome === "away"
                  ? u.match.away_team.short_name
                  : t("results.draw");
            return (
              <MatchRow key={u.match.id} href={`/${tournamentId}/matches/${u.match.id}`}>
                <span className="flex-1 truncate font-medium">{matchLabel(u.match)}</span>
                <Badge variant="secondary" className="shrink-0">
                  {t("matches.crowdFavored", { team: favored, percentage: u.consensusPercentage })}
                </Badge>
              </MatchRow>
            );
          })
        )}
      </MatchList>

      <MatchList title={t("matches.hardestTitle")}>
        {hardest.map((m) => (
          <MatchRow key={m.match.id} href={`/${tournamentId}/matches/${m.match.id}`}>
            <span className="flex-1 truncate font-medium">{matchLabel(m.match)}</span>
            <Badge variant="secondary" className="shrink-0">
              {t("matches.avgPointsLabel", { points: m.avgPoints })}
            </Badge>
          </MatchRow>
        ))}
      </MatchList>

      <MatchList title={t("matches.bestCalledTitle")}>
        {bestCalled.map((m) => (
          <MatchRow key={m.match.id} href={`/${tournamentId}/matches/${m.match.id}`}>
            <span className="flex-1 truncate font-medium">{matchLabel(m.match)}</span>
            <Badge variant="secondary" className="shrink-0">
              {t("matches.avgPointsLabel", { points: m.avgPoints })}
            </Badge>
          </MatchRow>
        ))}
      </MatchList>
    </div>
  );
}

function MatchList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function MatchRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
      >
        {children}
      </Link>
    </li>
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
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("matches.none")}</p>;
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
            <div className="mt-1 flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={a.avatarUrl ?? undefined} />
                <AvatarFallback>{a.initials}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{a.name}</span>
            </div>
          </div>
          <span className="shrink-0 font-display text-xl font-bold tabular-nums">{a.value}</span>
        </div>
      ))}
    </div>
  );
}

interface Award {
  key: string;
  icon: React.ReactNode;
  title: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  value: string;
}

function computeAwards(
  rankings: RankingWithPublicUser[],
  breakdown: BreakdownWithPublicUser[],
  t: T
): Award[] {
  const awards: Award[] = [];

  const pickRanking = (
    pool: RankingWithPublicUser[],
    score: (r: RankingWithPublicUser) => number
  ) =>
    pool.length === 0
      ? null
      : pool.reduce((best, r) => (score(r) > score(best) ? r : best), pool[0]);

  const pickBreakdown = (
    pool: BreakdownWithPublicUser[],
    score: (r: BreakdownWithPublicUser) => number
  ) =>
    pool.length === 0
      ? null
      : pool.reduce((best, r) => (score(r) > score(best) ? r : best), pool[0]);

  const toAward = (
    key: string,
    icon: React.ReactNode,
    title: string,
    user: PublicUserProfile,
    value: string
  ): Award => ({
    key,
    icon,
    title,
    name: getPublicUserDisplay(user),
    initials: getPublicUserInitials(user),
    avatarUrl: user.avatar_url,
    value,
  });

  // Leader — highest total points.
  const leader = pickRanking(rankings, (r) => r.total_points);
  if (leader && leader.total_points > 0) {
    awards.push(
      toAward(
        "leader",
        <Crown className="h-5 w-5" aria-hidden="true" />,
        t("awards.leader"),
        leader.user,
        t("awards.pointsValue", { points: leader.total_points })
      )
    );
  }

  // Specialist — most exact scorelines.
  const specialist = pickBreakdown(breakdown, (r) => r.exact_count);
  if (specialist && specialist.exact_count > 0) {
    awards.push(
      toAward(
        "specialist",
        <Target className="h-5 w-5" aria-hidden="true" />,
        t("awards.mostExact"),
        specialist.user,
        t("awards.exactValue", { count: specialist.exact_count })
      )
    );
  }

  // Sharpshooter — highest hit rate (points-earning predictions / predictions made).
  const countsByUser = new Map(breakdown.map((b) => [b.user_id, b]));
  let sharp: { user: RankingWithPublicUser["user"]; rate: number } | null = null;
  for (const r of rankings) {
    if (r.predictions_count <= 0) continue;
    const b = countsByUser.get(r.user_id);
    if (!b) continue;
    const hits = b.exact_count + b.goal_diff_count + b.winner_count;
    const rate = hits / r.predictions_count;
    if (!sharp || rate > sharp.rate) sharp = { user: r.user, rate };
  }
  if (sharp && sharp.rate > 0) {
    awards.push(
      toAward(
        "sharpshooter",
        <Percent className="h-5 w-5" aria-hidden="true" />,
        t("awards.highestAccuracy"),
        sharp.user,
        `${Math.round(sharp.rate * 100)}%`
      )
    );
  }

  // Most active — most predictions submitted.
  const active = pickRanking(rankings, (r) => r.predictions_count);
  if (active && active.predictions_count > 0) {
    awards.push(
      toAward(
        "active",
        <ListChecks className="h-5 w-5" aria-hidden="true" />,
        t("awards.mostPredictions"),
        active.user,
        String(active.predictions_count)
      )
    );
  }

  return awards;
}
