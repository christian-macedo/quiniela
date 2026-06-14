import { getBasePoints } from "@/lib/utils/scoring";

/**
 * Aggregate statistics derived from the set of predictions for a single match.
 *
 * Every value is computed purely from the predictions array (and, where a result
 * is needed, the match's final score), so it can run entirely client-side with no
 * additional data fetching.
 */

/** A prediction shape sufficient for stats — matches the fields on `Prediction`. */
export interface PredictionLike {
  predicted_home_score: number;
  predicted_away_score: number;
}

/** A match shape sufficient for result-dependent stats. */
export interface MatchResultLike {
  home_score: number | null;
  away_score: number | null;
}

export type Outcome = "home" | "draw" | "away";

export interface OutcomeOdds {
  /** Raw counts per outcome. */
  counts: Record<Outcome, number>;
  /** Integer percentages per outcome, guaranteed to sum to exactly 100 (when total > 0). */
  percentages: Record<Outcome, number>;
  total: number;
}

/** Determine the outcome of a scoreline from the home/away perspective. */
export function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

/**
 * Round a set of counts into integer percentages that sum to exactly 100,
 * using the largest-remainder (Hamilton) method. Returns all-zero when the
 * values sum to zero.
 */
export function distributePercentages(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((sum, v) => sum + v, 0);

  // Distribute the leftover units to the largest fractional remainders first.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1;
    remainder -= 1;
  }
  return result;
}

/** Compute the share of predictions favouring a home win / draw / away win. */
export function computeOutcomeOdds(predictions: PredictionLike[]): OutcomeOdds {
  const counts: Record<Outcome, number> = { home: 0, draw: 0, away: 0 };
  for (const p of predictions) {
    counts[outcomeOf(p.predicted_home_score, p.predicted_away_score)] += 1;
  }

  const [home, draw, away] = distributePercentages([counts.home, counts.draw, counts.away]);

  return {
    counts,
    percentages: { home, draw, away },
    total: predictions.length,
  };
}

export interface ScoreDistributionEntry {
  home: number;
  away: number;
  /** "2-1" style label. */
  label: string;
  count: number;
  /** Share of all predictions, rounded to an integer percentage. */
  percentage: number;
  /** True for the single most common scoreline. */
  isMostCommon: boolean;
}

/**
 * Group predictions by exact scoreline, sorted by count descending
 * (ties broken by more goals first, then by label for determinism).
 */
export function computeScoreDistribution(predictions: PredictionLike[]): ScoreDistributionEntry[] {
  const total = predictions.length;
  const groups = new Map<string, { home: number; away: number; count: number }>();

  for (const p of predictions) {
    const key = `${p.predicted_home_score}-${p.predicted_away_score}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        home: p.predicted_home_score,
        away: p.predicted_away_score,
        count: 1,
      });
    }
  }

  const entries = [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const goalsDiff = b.home + b.away - (a.home + a.away);
    if (goalsDiff !== 0) return goalsDiff;
    return `${a.home}-${a.away}`.localeCompare(`${b.home}-${b.away}`);
  });

  const topCount = entries.length > 0 ? entries[0].count : 0;

  return entries.map((e) => ({
    home: e.home,
    away: e.away,
    label: `${e.home}-${e.away}`,
    count: e.count,
    percentage: total > 0 ? Math.round((e.count / total) * 100) : 0,
    // Flag entries tied for the top count, but only when at least two predictions
    // agree — when every scoreline is unique the label carries no signal.
    isMostCommon: e.count === topCount && topCount > 1,
  }));
}

export interface Consensus {
  avgHome: number;
  avgAway: number;
  avgTotalGoals: number;
}

/** Average predicted scoreline and total goals, each rounded to one decimal. */
export function computeConsensus(predictions: PredictionLike[]): Consensus {
  if (predictions.length === 0) {
    return { avgHome: 0, avgAway: 0, avgTotalGoals: 0 };
  }

  const sumHome = predictions.reduce((s, p) => s + p.predicted_home_score, 0);
  const sumAway = predictions.reduce((s, p) => s + p.predicted_away_score, 0);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    avgHome: round1(sumHome / predictions.length),
    avgAway: round1(sumAway / predictions.length),
    avgTotalGoals: round1((sumHome + sumAway) / predictions.length),
  };
}

export interface AccuracyBreakdown {
  exact: number;
  winnerDiff: number;
  winnerOnly: number;
  miss: number;
}

/**
 * Classify each prediction by the points it would earn against the final result.
 * Returns null when the match has no recorded result yet.
 */
export function computeAccuracyBreakdown(
  predictions: PredictionLike[],
  match: MatchResultLike
): AccuracyBreakdown | null {
  if (match.home_score === null || match.away_score === null) return null;

  const breakdown: AccuracyBreakdown = { exact: 0, winnerDiff: 0, winnerOnly: 0, miss: 0 };
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
  return breakdown;
}

/**
 * The outcome the crowd favoured most. Ties are broken in home > draw > away order.
 * Returns null when there are no predictions.
 */
export function getConsensusOutcome(odds: OutcomeOdds): Outcome | null {
  if (odds.total === 0) return null;
  const { home, draw, away } = odds.counts;
  if (home >= draw && home >= away) return "home";
  if (draw >= away) return "draw";
  return "away";
}
