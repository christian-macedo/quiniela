import { describe, it, expect } from "vitest";
import {
  outcomeOf,
  computeOutcomeOdds,
  computeScoreDistribution,
  computeConsensus,
  computeAccuracyBreakdown,
  getConsensusOutcome,
  type PredictionLike,
} from "../match-stats";

function p(home: number, away: number): PredictionLike {
  return { predicted_home_score: home, predicted_away_score: away };
}

describe("outcomeOf", () => {
  it("classifies home win, away win, and draw", () => {
    expect(outcomeOf(2, 1)).toBe("home");
    expect(outcomeOf(0, 3)).toBe("away");
    expect(outcomeOf(1, 1)).toBe("draw");
  });
});

describe("computeOutcomeOdds", () => {
  it("returns zeroed percentages for an empty array", () => {
    const odds = computeOutcomeOdds([]);
    expect(odds.total).toBe(0);
    expect(odds.percentages).toEqual({ home: 0, draw: 0, away: 0 });
  });

  it("counts each outcome", () => {
    const odds = computeOutcomeOdds([p(2, 1), p(1, 0), p(1, 1), p(0, 2)]);
    expect(odds.counts).toEqual({ home: 2, draw: 1, away: 1 });
  });

  it("produces percentages that always sum to exactly 100", () => {
    // 1 home / 1 draw / 1 away → exact 33.33 each; largest-remainder must reach 100.
    const odds = computeOutcomeOdds([p(2, 1), p(1, 1), p(0, 1)]);
    const { home, draw, away } = odds.percentages;
    expect(home + draw + away).toBe(100);
  });

  it("keeps the sum at 100 for awkward thirds (7 predictions)", () => {
    const preds = [p(1, 0), p(2, 1), p(3, 0), p(1, 1), p(2, 2), p(0, 1), p(0, 3)];
    const { home, draw, away } = computeOutcomeOdds(preds).percentages;
    expect(home + draw + away).toBe(100);
  });

  it("gives 100% to a single dominant outcome", () => {
    const odds = computeOutcomeOdds([p(2, 0), p(3, 1), p(1, 0)]);
    expect(odds.percentages).toEqual({ home: 100, draw: 0, away: 0 });
  });
});

describe("computeScoreDistribution", () => {
  it("returns an empty array for no predictions", () => {
    expect(computeScoreDistribution([])).toEqual([]);
  });

  it("groups by exact scoreline and sorts by count desc", () => {
    const preds = [p(2, 1), p(2, 1), p(1, 1), p(2, 1), p(0, 0)];
    const dist = computeScoreDistribution(preds);
    expect(dist[0]).toMatchObject({ label: "2-1", count: 3, isMostCommon: true });
    expect(dist.map((d) => d.label)).toEqual(["2-1", "1-1", "0-0"]);
  });

  it("computes integer percentages", () => {
    const dist = computeScoreDistribution([p(2, 1), p(2, 1), p(1, 1), p(0, 0)]);
    const top = dist.find((d) => d.label === "2-1");
    expect(top?.percentage).toBe(50);
  });

  it("does not flag a most-common scoreline when every prediction is unique", () => {
    const dist = computeScoreDistribution([p(2, 1), p(1, 1)]);
    expect(dist.every((d) => !d.isMostCommon)).toBe(true);
  });

  it("flags every scoreline tied for the top count when at least two agree", () => {
    const dist = computeScoreDistribution([p(2, 1), p(2, 1), p(1, 1), p(1, 1), p(0, 0)]);
    const flagged = dist.filter((d) => d.isMostCommon).map((d) => d.label);
    expect(flagged.sort()).toEqual(["1-1", "2-1"]);
  });
});

describe("computeConsensus", () => {
  it("returns zeros for an empty array", () => {
    expect(computeConsensus([])).toEqual({ avgHome: 0, avgAway: 0, avgTotalGoals: 0 });
  });

  it("averages and rounds to one decimal", () => {
    const consensus = computeConsensus([p(2, 1), p(1, 2), p(2, 0)]);
    expect(consensus.avgHome).toBe(1.7);
    expect(consensus.avgAway).toBe(1);
    expect(consensus.avgTotalGoals).toBe(2.7);
  });
});

describe("computeAccuracyBreakdown", () => {
  it("returns null when the match has no result", () => {
    expect(computeAccuracyBreakdown([p(2, 1)], { home_score: null, away_score: null })).toBeNull();
  });

  it("classifies predictions by points against the result", () => {
    const match = { home_score: 2, away_score: 1 };
    const preds = [
      p(2, 1), // exact → 3
      p(3, 2), // correct winner + diff → 2
      p(4, 0), // correct winner only → 1
      p(0, 2), // wrong → 0
    ];
    expect(computeAccuracyBreakdown(preds, match)).toEqual({
      exact: 1,
      winnerDiff: 1,
      winnerOnly: 1,
      miss: 1,
    });
  });

  it("handles a 0-0 result", () => {
    const match = { home_score: 0, away_score: 0 };
    // 1-1 vs 0-0 is a correct draw with matching goal difference (0) → 2 points.
    expect(computeAccuracyBreakdown([p(0, 0), p(1, 1), p(2, 0)], match)).toEqual({
      exact: 1,
      winnerDiff: 1,
      winnerOnly: 0,
      miss: 1,
    });
  });
});

describe("getConsensusOutcome", () => {
  it("returns null with no predictions", () => {
    expect(getConsensusOutcome(computeOutcomeOdds([]))).toBeNull();
  });

  it("returns the most-predicted outcome", () => {
    expect(getConsensusOutcome(computeOutcomeOdds([p(2, 0), p(3, 1), p(0, 1)]))).toBe("home");
    expect(getConsensusOutcome(computeOutcomeOdds([p(0, 1), p(0, 2), p(1, 1)]))).toBe("away");
  });

  it("breaks ties in home > draw > away order", () => {
    expect(getConsensusOutcome(computeOutcomeOdds([p(2, 0), p(1, 1)]))).toBe("home");
    expect(getConsensusOutcome(computeOutcomeOdds([p(1, 1), p(0, 1)]))).toBe("draw");
  });
});
