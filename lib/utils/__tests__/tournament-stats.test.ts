import { describe, it, expect } from "vitest";
import {
  computeOverviewKpis,
  computeTournamentAccuracy,
  computeCrowdCalledRate,
  computeOutcomeBias,
  computeMatchSuperlatives,
  type MatchStatGroup,
} from "../tournament-stats";
import type { PredictionLike } from "../match-stats";

function p(home: number, away: number): PredictionLike {
  return { predicted_home_score: home, predicted_away_score: away };
}

/** A minimal completed-match group with an id for superlative assertions. */
function group(
  id: string,
  home: number | null,
  away: number | null,
  predictions: PredictionLike[]
): MatchStatGroup<{ id: string; home_score: number | null; away_score: number | null }> {
  return { match: { id, home_score: home, away_score: away }, predictions };
}

describe("computeOverviewKpis", () => {
  it("returns zeros when nothing has happened", () => {
    const kpis = computeOverviewKpis({
      participantCount: 0,
      totalMatches: 0,
      predictionsSubmitted: 0,
      totalPointsAwarded: 0,
      completed: [],
    });
    expect(kpis).toEqual({
      participantCount: 0,
      totalMatches: 0,
      completedMatches: 0,
      predictionsSubmitted: 0,
      totalPointsAwarded: 0,
      avgPointsPerPrediction: 0,
      exactRate: 0,
    });
  });

  it("counts completed matches and computes averages and exact rate", () => {
    // Match A 2-1: predictions [2-1 exact, 1-0 (winner only)]
    // Match B 0-0: predictions [0-0 exact, 1-1 (winner only, draw)]
    const completed = [group("a", 2, 1, [p(2, 1), p(1, 0)]), group("b", 0, 0, [p(0, 0), p(1, 1)])];
    const kpis = computeOverviewKpis({
      participantCount: 5,
      totalMatches: 10,
      predictionsSubmitted: 4,
      totalPointsAwarded: 8,
      completed,
    });
    expect(kpis.completedMatches).toBe(2);
    expect(kpis.predictionsSubmitted).toBe(4);
    expect(kpis.avgPointsPerPrediction).toBe(2); // 8 / 4
    expect(kpis.exactRate).toBe(50); // 2 exact of 4 predictions
  });

  it("ignores groups without a recorded result", () => {
    const kpis = computeOverviewKpis({
      participantCount: 1,
      totalMatches: 2,
      predictionsSubmitted: 1,
      totalPointsAwarded: 0,
      completed: [group("a", null, null, [p(1, 0)])],
    });
    expect(kpis.completedMatches).toBe(0);
    expect(kpis.exactRate).toBe(0);
  });
});

describe("computeTournamentAccuracy", () => {
  it("classifies every prediction across matches", () => {
    // Match 3-1:
    //  3-1 exact (3), 2-0 winner+diff (2), 1-0 winner only (1), 0-2 miss (0)
    const groups = [group("a", 3, 1, [p(3, 1), p(2, 0), p(1, 0), p(0, 2)])];
    expect(computeTournamentAccuracy(groups)).toEqual({
      exact: 1,
      winnerDiff: 1,
      winnerOnly: 1,
      miss: 1,
    });
  });

  it("skips matches without results", () => {
    const groups = [group("a", null, null, [p(1, 0)])];
    expect(computeTournamentAccuracy(groups)).toEqual({
      exact: 0,
      winnerDiff: 0,
      winnerOnly: 0,
      miss: 0,
    });
  });
});

describe("computeCrowdCalledRate", () => {
  it("counts matches where the consensus outcome matched the result", () => {
    // Match A 2-0 (home): crowd leans home (2 home, 1 away) -> called
    // Match B 0-1 (away): crowd leans home (2 home, 1 away) -> missed
    const groups = [
      group("a", 2, 0, [p(1, 0), p(3, 1), p(0, 1)]),
      group("b", 0, 1, [p(1, 0), p(2, 1), p(0, 2)]),
    ];
    const rate = computeCrowdCalledRate(groups);
    expect(rate).toEqual({ called: 1, total: 2, percentage: 50 });
  });

  it("excludes matches with no predictions from the denominator", () => {
    const groups = [group("a", 2, 0, []), group("b", 1, 0, [p(1, 0)])];
    const rate = computeCrowdCalledRate(groups);
    expect(rate).toEqual({ called: 1, total: 1, percentage: 100 });
  });
});

describe("computeOutcomeBias", () => {
  it("contrasts actual results with the crowd's predicted outcomes", () => {
    // Two completed matches, both home wins (2-0, 1-0).
    // Crowd predicted: match A all home, match B all away -> 50/50 predicted split.
    const groups = [group("a", 2, 0, [p(2, 0), p(1, 0)]), group("b", 1, 0, [p(0, 1), p(0, 2)])];
    const bias = computeOutcomeBias(groups);
    expect(bias.actual.counts).toEqual({ home: 2, draw: 0, away: 0 });
    expect(bias.actual.percentages.home).toBe(100);
    expect(bias.predicted.counts).toEqual({ home: 2, draw: 0, away: 2 });
    expect(bias.predicted.percentages).toEqual({ home: 50, draw: 0, away: 50 });
    expect(bias.avgGoals.actualTotal).toBe(1.5); // (2 + 1) / 2
    expect(bias.scorelines[0].count).toBeGreaterThan(0);
  });

  it("returns zeroed averages with no completed matches", () => {
    const bias = computeOutcomeBias([]);
    expect(bias.actual.total).toBe(0);
    expect(bias.avgGoals.actualTotal).toBe(0);
    expect(bias.avgGoals.predictedTotal).toBe(0);
    expect(bias.scorelines).toEqual([]);
  });
});

describe("computeMatchSuperlatives", () => {
  it("ranks hardest, best-called, and upset matches", () => {
    // easy 2-1: both nail exact (avg 3); consensus home = result, no upset.
    // hard 0-2 (away): both predicted home (avg 0); consensus home 100% -> upset.
    // mild 0-1 (away): 2/3 favoured home (avg 1); consensus home 67% -> upset.
    const groups = [
      group("easy", 2, 1, [p(2, 1), p(2, 1)]),
      group("hard", 0, 2, [p(3, 0), p(2, 0)]),
      group("mild", 0, 1, [p(1, 0), p(2, 1), p(0, 1)]),
    ];
    const result = computeMatchSuperlatives(groups, 3);

    expect(result.bestCalled[0].match.id).toBe("easy");
    expect(result.bestCalled[0].avgPoints).toBe(3);
    expect(result.hardest[0].match.id).toBe("hard");
    expect(result.hardest[0].avgPoints).toBe(0);

    // Both wrong-consensus matches surface, strongest wrong lean first.
    expect(result.upsets).toHaveLength(2);
    expect(result.upsets[0].match.id).toBe("hard");
    expect(result.upsets[0].consensusOutcome).toBe("home");
    expect(result.upsets[0].actualOutcome).toBe("away");
    expect(result.upsets[0].consensusPercentage).toBe(100);
    expect(result.upsets[1].match.id).toBe("mild");
  });

  it("respects the limit and skips empty/unfinished matches", () => {
    const groups = [
      group("a", 1, 0, [p(1, 0)]),
      group("b", 2, 0, [p(2, 0)]),
      group("c", 0, 0, []),
      group("d", null, null, [p(1, 1)]),
    ];
    const result = computeMatchSuperlatives(groups, 1);
    expect(result.hardest).toHaveLength(1);
    expect(result.bestCalled).toHaveLength(1);
  });
});
