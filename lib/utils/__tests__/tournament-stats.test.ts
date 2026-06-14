import { describe, it, expect } from "vitest";
import {
  computeOverviewKpis,
  computeTournamentAccuracy,
  computeCrowdCalledRate,
  computeOutcomeBias,
  computeTeamSuperlatives,
  type MatchStatGroup,
} from "../tournament-stats";
import type { MatchResultLike, PredictionLike } from "../match-stats";

function p(home: number, away: number): PredictionLike {
  return { predicted_home_score: home, predicted_away_score: away };
}

interface TeamRef {
  id: string;
}

type TeamMatchGroup = MatchStatGroup<MatchResultLike & { home_team: TeamRef; away_team: TeamRef }>;

/** A completed match between two teams, with the crowd's predictions for it. */
function teamGroup(
  homeId: string,
  awayId: string,
  home: number | null,
  away: number | null,
  predictions: PredictionLike[]
): TeamMatchGroup {
  return {
    match: {
      home_score: home,
      away_score: away,
      home_team: { id: homeId },
      away_team: { id: awayId },
    },
    predictions,
  };
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

describe("computeTeamSuperlatives", () => {
  it("tallies goals and draws across home and away appearances", () => {
    // A: home 3-1 vs B (A 3, B 1), then away 0-0 vs C (A 0, C 0).
    const groups = [teamGroup("A", "B", 3, 1, [p(1, 1)]), teamGroup("C", "A", 0, 0, [p(1, 1)])];
    const { topScorers, nappers } = computeTeamSuperlatives(groups);

    expect(topScorers[0]).toEqual({ team: { id: "A" }, value: 3 });
    // The 0-0 draw counts for both teams in that match.
    expect(nappers.map((n) => n.team.id).sort()).toEqual(["A", "C"]);
    expect(nappers.every((n) => n.value === 1)).toBe(true);
  });

  it("surfaces underdog winners the crowd's majority backed to lose", () => {
    // Crowd heavily favours B (away win), but A (home) wins -> A is the underdog.
    const groups = [teamGroup("A", "B", 2, 0, [p(0, 2), p(0, 1), p(1, 0)])];
    const { underdogs } = computeTeamSuperlatives(groups);

    expect(underdogs).toHaveLength(1);
    expect(underdogs[0].team.id).toBe("A");
    expect(underdogs[0].value).toBe(1);
  });

  it("ranks safe bets by crowd accuracy as a share of possible points", () => {
    // Match X 2-1: both nail the exact score -> 100% accuracy for X1 and X2.
    // Match Y 1-0: both miss entirely -> 0% accuracy for Y1 and Y2.
    const groups = [
      teamGroup("X1", "X2", 2, 1, [p(2, 1), p(2, 1)]),
      teamGroup("Y1", "Y2", 1, 0, [p(0, 3)]),
    ];
    const { safeBets } = computeTeamSuperlatives(groups, 4);

    expect(safeBets[0].value).toBe(100);
    expect(safeBets[0].team.id).toMatch(/X/);
    expect(safeBets.find((s) => s.team.id === "Y1")?.value).toBe(0);
  });

  it("respects the limit and ignores unfinished matches", () => {
    const groups = [
      teamGroup("A", "B", 5, 0, [p(1, 0)]),
      teamGroup("C", "D", 4, 0, [p(1, 0)]),
      teamGroup("E", "F", 3, 0, [p(1, 0)]),
      teamGroup("G", "H", null, null, [p(1, 0)]),
    ];
    const { topScorers } = computeTeamSuperlatives(groups, 2);
    expect(topScorers).toHaveLength(2);
    expect(topScorers.map((t) => t.team.id)).toEqual(["A", "C"]);
  });
});
