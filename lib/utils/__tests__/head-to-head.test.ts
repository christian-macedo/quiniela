import { describe, it, expect } from "vitest";
import { computeHeadToHead } from "../head-to-head";
import type { MatchStatus, PredictionWithMatch } from "@/types/database";

/** Build a minimal PredictionWithMatch for a given match/points/status. */
function makePrediction(
  matchId: string,
  pointsEarned: number,
  status: MatchStatus = "completed"
): PredictionWithMatch {
  return {
    id: `pred-${matchId}`,
    user_id: "user",
    match_id: matchId,
    predicted_home_score: 0,
    predicted_away_score: 0,
    points_earned: pointsEarned,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    match: {
      id: matchId,
      tournament_id: "tournament",
      home_team_id: "home",
      away_team_id: "away",
      match_date: "2026-06-01T00:00:00Z",
      home_score: 1,
      away_score: 0,
      status,
      round: null,
      multiplier: 1,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      // Teams are not used by the tally; cast through unknown to keep the fixture small.
    } as PredictionWithMatch["match"],
  };
}

describe("computeHeadToHead", () => {
  it("counts a match where the current user scored higher as a win", () => {
    const result = computeHeadToHead([makePrediction("m1", 3)], [makePrediction("m1", 1)]);
    expect(result).toEqual({ youWon: 1, opponentWon: 0, ties: 0, total: 1 });
  });

  it("counts a match where the opponent scored higher as an opponent win", () => {
    const result = computeHeadToHead([makePrediction("m1", 0)], [makePrediction("m1", 2)]);
    expect(result).toEqual({ youWon: 0, opponentWon: 1, ties: 0, total: 1 });
  });

  it("counts equal points as a tie", () => {
    const result = computeHeadToHead([makePrediction("m1", 2)], [makePrediction("m1", 2)]);
    expect(result).toEqual({ youWon: 0, opponentWon: 0, ties: 1, total: 1 });
  });

  it("skips matches predicted by only one user", () => {
    const result = computeHeadToHead(
      [makePrediction("m1", 3), makePrediction("m2", 1)],
      [makePrediction("m1", 1)]
    );
    expect(result).toEqual({ youWon: 1, opponentWon: 0, ties: 0, total: 1 });
  });

  it("ignores non-completed matches even if both users predicted them", () => {
    const result = computeHeadToHead(
      [makePrediction("m1", 0, "scheduled")],
      [makePrediction("m1", 0, "scheduled")]
    );
    expect(result).toEqual({ youWon: 0, opponentWon: 0, ties: 0, total: 0 });
  });

  it("aggregates across multiple matches", () => {
    const yours = [makePrediction("m1", 3), makePrediction("m2", 0), makePrediction("m3", 2)];
    const theirs = [makePrediction("m1", 1), makePrediction("m2", 2), makePrediction("m3", 2)];
    expect(computeHeadToHead(yours, theirs)).toEqual({
      youWon: 1,
      opponentWon: 1,
      ties: 1,
      total: 3,
    });
  });

  it("returns an empty tally when there are no predictions", () => {
    expect(computeHeadToHead([], [])).toEqual({
      youWon: 0,
      opponentWon: 0,
      ties: 0,
      total: 0,
    });
  });
});
