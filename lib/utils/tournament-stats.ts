import { getBasePoints } from "@/lib/utils/scoring";
import {
  computeOutcomeOdds,
  computeScoreDistribution,
  getConsensusOutcome,
  outcomeOf,
  distributePercentages,
  type Outcome,
  type OutcomeOdds,
  type PredictionLike,
  type MatchResultLike,
  type ScoreDistributionEntry,
  type AccuracyBreakdown,
} from "@/lib/utils/match-stats";

/**
 * Tournament-level statistics, aggregated across every completed match and its
 * predictions. Each function reuses the per-match helpers in match-stats.ts, so
 * the whole module is pure and runs client-side with no extra data fetching.
 *
 * Callers should pass only *completed* matches (home_score / away_score non-null);
 * every function additionally guards against missing results so partial data is
 * simply ignored rather than throwing.
 */

/** A completed match grouped with all predictions submitted for it. */
export interface MatchStatGroup<M extends MatchResultLike = MatchResultLike> {
  match: M;
  predictions: PredictionLike[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** True when a match has a recorded final score. */
function hasResult(match: MatchResultLike): match is { home_score: number; away_score: number } {
  return match.home_score !== null && match.away_score !== null;
}

/* ------------------------------- Overview KPIs ------------------------------ */

export interface OverviewInput<M extends MatchResultLike> {
  participantCount: number;
  totalMatches: number;
  /** Total predictions submitted across the whole tournament (all matches). */
  predictionsSubmitted: number;
  /** Sum of points_earned across all predictions (includes match multipliers). */
  totalPointsAwarded: number;
  /** Completed matches with their predictions, for accuracy-based KPIs. */
  completed: MatchStatGroup<M>[];
}

export interface OverviewKpis {
  participantCount: number;
  totalMatches: number;
  completedMatches: number;
  predictionsSubmitted: number;
  totalPointsAwarded: number;
  /** Average points per prediction, rounded to one decimal. */
  avgPointsPerPrediction: number;
  /** Share of completed-match predictions that nailed the exact score (integer %). */
  exactRate: number;
}

export function computeOverviewKpis<M extends MatchResultLike>(
  input: OverviewInput<M>
): OverviewKpis {
  const completed = input.completed.filter((g) => hasResult(g.match));

  let exact = 0;
  let completedPredictions = 0;
  for (const { match, predictions } of completed) {
    for (const p of predictions) {
      completedPredictions += 1;
      const base = getBasePoints(
        p.predicted_home_score,
        p.predicted_away_score,
        match.home_score as number,
        match.away_score as number
      );
      if (base === 3) exact += 1;
    }
  }

  return {
    participantCount: input.participantCount,
    totalMatches: input.totalMatches,
    completedMatches: completed.length,
    predictionsSubmitted: input.predictionsSubmitted,
    totalPointsAwarded: input.totalPointsAwarded,
    avgPointsPerPrediction:
      input.predictionsSubmitted > 0
        ? round1(input.totalPointsAwarded / input.predictionsSubmitted)
        : 0,
    exactRate: completedPredictions > 0 ? Math.round((exact / completedPredictions) * 100) : 0,
  };
}

/* ----------------------------- Accuracy breakdown -------------------------- */

/**
 * Sum every completed-match prediction into the four scoring categories.
 * Mirrors computeAccuracyBreakdown but across the whole tournament.
 */
export function computeTournamentAccuracy<M extends MatchResultLike>(
  groups: MatchStatGroup<M>[]
): AccuracyBreakdown {
  const breakdown: AccuracyBreakdown = { exact: 0, winnerDiff: 0, winnerOnly: 0, miss: 0 };
  for (const { match, predictions } of groups) {
    if (!hasResult(match)) continue;
    for (const p of predictions) {
      const base = getBasePoints(
        p.predicted_home_score,
        p.predicted_away_score,
        match.home_score,
        match.away_score
      );
      if (base === 3) breakdown.exact += 1;
      else if (base === 2) breakdown.winnerDiff += 1;
      else if (base === 1) breakdown.winnerOnly += 1;
      else breakdown.miss += 1;
    }
  }
  return breakdown;
}

/* ----------------------------- Crowd called rate --------------------------- */

export interface CrowdCalledRate {
  /** Completed matches where the consensus outcome matched the result. */
  called: number;
  /** Completed matches that had at least one prediction (the denominator). */
  total: number;
  /** called / total as an integer percentage. */
  percentage: number;
}

export function computeCrowdCalledRate<M extends MatchResultLike>(
  groups: MatchStatGroup<M>[]
): CrowdCalledRate {
  let called = 0;
  let total = 0;
  for (const { match, predictions } of groups) {
    if (!hasResult(match) || predictions.length === 0) continue;
    total += 1;
    const consensus = getConsensusOutcome(computeOutcomeOdds(predictions));
    const actual = outcomeOf(match.home_score, match.away_score);
    if (consensus === actual) called += 1;
  }
  return {
    called,
    total,
    percentage: total > 0 ? Math.round((called / total) * 100) : 0,
  };
}

/* ------------------------------ Results & bias ----------------------------- */

export interface AvgGoals {
  predictedHome: number;
  predictedAway: number;
  predictedTotal: number;
  actualHome: number;
  actualAway: number;
  actualTotal: number;
}

export interface OutcomeBias {
  /** Distribution of actual results across completed matches. */
  actual: OutcomeOdds;
  /** Distribution of the crowd's predicted outcomes across all those predictions. */
  predicted: OutcomeOdds;
  avgGoals: AvgGoals;
  /** Most common *actual* scorelines, sorted by frequency. */
  scorelines: ScoreDistributionEntry[];
}

export function computeOutcomeBias<M extends MatchResultLike>(
  groups: MatchStatGroup<M>[]
): OutcomeBias {
  const completed = groups.filter((g) => hasResult(g.match));

  // Actual outcome split across completed matches.
  const actualCounts: Record<Outcome, number> = { home: 0, draw: 0, away: 0 };
  let sumActualHome = 0;
  let sumActualAway = 0;
  // Reuse the scoreline grouping by feeding actual results in PredictionLike shape.
  const actualAsPredictions: PredictionLike[] = [];
  for (const { match } of completed) {
    const home = match.home_score as number;
    const away = match.away_score as number;
    actualCounts[outcomeOf(home, away)] += 1;
    sumActualHome += home;
    sumActualAway += away;
    actualAsPredictions.push({ predicted_home_score: home, predicted_away_score: away });
  }
  const [aHome, aDraw, aAway] = distributePercentages([
    actualCounts.home,
    actualCounts.draw,
    actualCounts.away,
  ]);

  // Predicted outcome split across every completed-match prediction.
  const allPredictions = completed.flatMap((g) => g.predictions);
  const predicted = computeOutcomeOdds(allPredictions);

  let sumPredHome = 0;
  let sumPredAway = 0;
  for (const p of allPredictions) {
    sumPredHome += p.predicted_home_score;
    sumPredAway += p.predicted_away_score;
  }

  const matchCount = completed.length;
  const predCount = allPredictions.length;

  return {
    actual: {
      counts: actualCounts,
      percentages: { home: aHome, draw: aDraw, away: aAway },
      total: matchCount,
    },
    predicted,
    avgGoals: {
      predictedHome: predCount > 0 ? round1(sumPredHome / predCount) : 0,
      predictedAway: predCount > 0 ? round1(sumPredAway / predCount) : 0,
      predictedTotal: predCount > 0 ? round1((sumPredHome + sumPredAway) / predCount) : 0,
      actualHome: matchCount > 0 ? round1(sumActualHome / matchCount) : 0,
      actualAway: matchCount > 0 ? round1(sumActualAway / matchCount) : 0,
      actualTotal: matchCount > 0 ? round1((sumActualHome + sumActualAway) / matchCount) : 0,
    },
    scorelines: computeScoreDistribution(actualAsPredictions),
  };
}

/* ----------------------------- Match superlatives -------------------------- */

export interface MatchMetric<M> {
  match: M;
  /** Average base points (0-3, no multiplier) the crowd earned on this match. */
  avgPoints: number;
  predictionCount: number;
}

export interface UpsetMetric<M> {
  match: M;
  consensusOutcome: Outcome;
  actualOutcome: Outcome;
  /** The crowd's share (integer %) on the outcome they wrongly favoured. */
  consensusPercentage: number;
}

export interface MatchSuperlatives<M> {
  /** Lowest average points first — the matches the crowd struggled with most. */
  hardest: MatchMetric<M>[];
  /** Highest average points first — the matches the crowd nailed. */
  bestCalled: MatchMetric<M>[];
  /** Strongest wrong consensus first — surfaces underdog wins. */
  upsets: UpsetMetric<M>[];
}

export function computeMatchSuperlatives<M extends MatchResultLike>(
  groups: MatchStatGroup<M>[],
  limit = 3
): MatchSuperlatives<M> {
  const metrics: MatchMetric<M>[] = [];
  const upsets: UpsetMetric<M>[] = [];

  for (const { match, predictions } of groups) {
    if (!hasResult(match) || predictions.length === 0) continue;

    const totalBase = predictions.reduce(
      (sum, p) =>
        sum +
        getBasePoints(
          p.predicted_home_score,
          p.predicted_away_score,
          match.home_score,
          match.away_score
        ),
      0
    );
    metrics.push({
      match,
      avgPoints: round1(totalBase / predictions.length),
      predictionCount: predictions.length,
    });

    const odds = computeOutcomeOdds(predictions);
    const consensusOutcome = getConsensusOutcome(odds);
    const actualOutcome = outcomeOf(match.home_score, match.away_score);
    if (consensusOutcome !== null && consensusOutcome !== actualOutcome) {
      upsets.push({
        match,
        consensusOutcome,
        actualOutcome,
        consensusPercentage: odds.percentages[consensusOutcome],
      });
    }
  }

  const hardest = [...metrics].sort((a, b) => a.avgPoints - b.avgPoints).slice(0, limit);
  const bestCalled = [...metrics].sort((a, b) => b.avgPoints - a.avgPoints).slice(0, limit);
  upsets.sort((a, b) => b.consensusPercentage - a.consensusPercentage);

  return { hardest, bestCalled, upsets: upsets.slice(0, limit) };
}
