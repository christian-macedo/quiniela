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

/* ------------------------------ Team superlatives -------------------------- */

/** A completed match carrying both teams, the minimum needed for team stats. */
type TeamMatch<TeamT> = MatchResultLike & { home_team: TeamT; away_team: TeamT };

export interface TeamStat<TeamT> {
  team: TeamT;
  /** The metric's headline figure (goals, draws, upset wins, or accuracy %). */
  value: number;
}

export interface TeamSuperlatives<TeamT> {
  /** Most wins after the crowd's majority backed their opponent. */
  underdogs: TeamStat<TeamT>[];
  /** Highest crowd accuracy (% of possible base points) on their matches. */
  safeBets: TeamStat<TeamT>[];
  /** Most goals scored across completed matches. */
  topScorers: TeamStat<TeamT>[];
  /** Most matches ending in a draw. */
  nappers: TeamStat<TeamT>[];
}

/**
 * Team-level superlatives aggregated across completed matches. Each team is
 * keyed by id, so a team appearing as both home and away accumulates correctly.
 * Predictions feed the accuracy-based "safe bets" and upset detection; the goal
 * and draw tallies are purely result-driven.
 */
export function computeTeamSuperlatives<TeamT extends { id: string }>(
  groups: MatchStatGroup<TeamMatch<TeamT>>[],
  limit = 3
): TeamSuperlatives<TeamT> {
  interface Acc {
    team: TeamT;
    goals: number;
    draws: number;
    upsetWins: number;
    /** Sum of consensus % overcome, breaking ties between equal upset counts. */
    upsetMargin: number;
    basePoints: number;
    predictions: number;
  }

  const accs = new Map<string, Acc>();
  const accFor = (team: TeamT): Acc => {
    let acc = accs.get(team.id);
    if (!acc) {
      acc = {
        team,
        goals: 0,
        draws: 0,
        upsetWins: 0,
        upsetMargin: 0,
        basePoints: 0,
        predictions: 0,
      };
      accs.set(team.id, acc);
    }
    return acc;
  };

  for (const { match, predictions } of groups) {
    if (!hasResult(match)) continue;
    const home = match.home_score;
    const away = match.away_score;
    const homeAcc = accFor(match.home_team);
    const awayAcc = accFor(match.away_team);

    homeAcc.goals += home;
    awayAcc.goals += away;

    const actual = outcomeOf(home, away);
    if (actual === "draw") {
      homeAcc.draws += 1;
      awayAcc.draws += 1;
    }

    for (const p of predictions) {
      const base = getBasePoints(p.predicted_home_score, p.predicted_away_score, home, away);
      homeAcc.basePoints += base;
      homeAcc.predictions += 1;
      awayAcc.basePoints += base;
      awayAcc.predictions += 1;
    }

    if (predictions.length > 0) {
      const odds = computeOutcomeOdds(predictions);
      const consensus = getConsensusOutcome(odds);
      // An underdog winner is a team that won after the crowd backed its opponent.
      if (consensus === "away" && actual === "home") {
        homeAcc.upsetWins += 1;
        homeAcc.upsetMargin += odds.percentages.away;
      } else if (consensus === "home" && actual === "away") {
        awayAcc.upsetWins += 1;
        awayAcc.upsetMargin += odds.percentages.home;
      }
    }
  }

  const all = [...accs.values()];

  const underdogs = all
    .filter((a) => a.upsetWins > 0)
    .sort((a, b) => b.upsetWins - a.upsetWins || b.upsetMargin - a.upsetMargin)
    .slice(0, limit)
    .map((a) => ({ team: a.team, value: a.upsetWins }));

  const safeBets = all
    .filter((a) => a.predictions > 0)
    .map((a) => ({
      team: a.team,
      value: Math.round((a.basePoints / (a.predictions * 3)) * 100),
      predictions: a.predictions,
    }))
    .sort((a, b) => b.value - a.value || b.predictions - a.predictions)
    .slice(0, limit)
    .map(({ team, value }) => ({ team, value }));

  const topScorers = all
    .filter((a) => a.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit)
    .map((a) => ({ team: a.team, value: a.goals }));

  const nappers = all
    .filter((a) => a.draws > 0)
    .sort((a, b) => b.draws - a.draws)
    .slice(0, limit)
    .map((a) => ({ team: a.team, value: a.draws }));

  return { underdogs, safeBets, topScorers, nappers };
}
