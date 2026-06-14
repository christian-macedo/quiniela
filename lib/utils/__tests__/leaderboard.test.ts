import { describe, it, expect } from "vitest";
import {
  assignRanks,
  buildLeaderboard,
  compareLeaderboard,
  type LeaderboardSortStats,
} from "@/lib/utils/leaderboard";
import type {
  BreakdownWithPublicUser,
  PublicUserProfile,
  RankingWithPublicUser,
} from "@/types/database";

function makeUser(id: string): PublicUserProfile {
  return {
    id,
    screen_name: `user-${id}`,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makeStats(overrides: Partial<LeaderboardSortStats> = {}): LeaderboardSortStats {
  return {
    total_points: 0,
    exact_count: 0,
    goal_diff_count: 0,
    winner_count: 0,
    ...overrides,
  };
}

function makeRanking(
  id: string,
  overrides: Partial<RankingWithPublicUser> = {}
): RankingWithPublicUser {
  return {
    user_id: id,
    tournament_id: "t1",
    total_points: 0,
    predictions_count: 0,
    rank: 0,
    user: makeUser(id),
    ...overrides,
  };
}

function makeBreakdown(
  id: string,
  overrides: Partial<BreakdownWithPublicUser> = {}
): BreakdownWithPublicUser {
  return {
    user_id: id,
    tournament_id: "t1",
    exact_count: 0,
    goal_diff_count: 0,
    winner_count: 0,
    total_points: 0,
    user: makeUser(id),
    ...overrides,
  };
}

describe("compareLeaderboard", () => {
  it("orders by total points first", () => {
    expect(
      compareLeaderboard(makeStats({ total_points: 10 }), makeStats({ total_points: 5 }))
    ).toBeLessThan(0);
  });

  it("breaks point ties by exact count", () => {
    const a = makeStats({ total_points: 10, exact_count: 3 });
    const b = makeStats({ total_points: 10, exact_count: 5 });
    expect(compareLeaderboard(a, b)).toBeGreaterThan(0);
  });

  it("breaks exact ties by winner + goal difference count", () => {
    const a = makeStats({ total_points: 10, exact_count: 3, goal_diff_count: 1 });
    const b = makeStats({ total_points: 10, exact_count: 3, goal_diff_count: 4 });
    expect(compareLeaderboard(a, b)).toBeGreaterThan(0);
  });

  it("breaks goal-difference ties by winner count", () => {
    const a = makeStats({ total_points: 10, exact_count: 3, goal_diff_count: 1, winner_count: 2 });
    const b = makeStats({ total_points: 10, exact_count: 3, goal_diff_count: 1, winner_count: 6 });
    expect(compareLeaderboard(a, b)).toBeGreaterThan(0);
  });

  it("returns 0 when every criterion is equal", () => {
    const stats = makeStats({ total_points: 10, exact_count: 3, goal_diff_count: 1, winner_count: 2 });
    expect(compareLeaderboard(stats, { ...stats })).toBe(0);
  });
});

describe("assignRanks", () => {
  it("sorts by the criteria and numbers ranks sequentially", () => {
    const items = [
      makeStats({ total_points: 5 }),
      makeStats({ total_points: 10 }),
      makeStats({ total_points: 7 }),
    ];

    const ranked = assignRanks(items, (s) => s);

    expect(ranked.map((r) => [r.total_points, r.rank])).toEqual([
      [10, 1],
      [7, 2],
      [5, 3],
    ]);
  });

  it("gives tied entries the same rank and skips the next position", () => {
    const items = [
      makeStats({ total_points: 10, exact_count: 2 }),
      makeStats({ total_points: 10, exact_count: 2 }),
      makeStats({ total_points: 4 }),
    ];

    const ranked = assignRanks(items, (s) => s);

    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("does not mutate the input array", () => {
    const items = [makeStats({ total_points: 1 }), makeStats({ total_points: 9 })];
    const snapshot = items.map((i) => i.total_points);

    assignRanks(items, (s) => s);

    expect(items.map((i) => i.total_points)).toEqual(snapshot);
  });
});

describe("buildLeaderboard", () => {
  it("ranks both cards consistently using breakdown counts as tie-breakers", () => {
    // a and b are tied on points; a wins on exact count.
    const rankings = [
      makeRanking("a", { total_points: 10, rank: 99 }),
      makeRanking("b", { total_points: 10, rank: 99 }),
      makeRanking("c", { total_points: 3, rank: 99 }),
    ];
    const breakdown = [
      makeBreakdown("a", { total_points: 10, exact_count: 3 }),
      makeBreakdown("b", { total_points: 10, exact_count: 1 }),
      makeBreakdown("c", { total_points: 3, winner_count: 3 }),
    ];

    const result = buildLeaderboard(rankings, breakdown);

    expect(result.rankings.map((r) => [r.user_id, r.rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(result.breakdown.map((r) => [r.user_id, r.rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("lets fully tied participants share a rank in both cards", () => {
    const rankings = [
      makeRanking("a", { total_points: 8 }),
      makeRanking("b", { total_points: 8 }),
    ];
    const breakdown = [
      makeBreakdown("a", { total_points: 8, exact_count: 2, goal_diff_count: 1, winner_count: 1 }),
      makeBreakdown("b", { total_points: 8, exact_count: 2, goal_diff_count: 1, winner_count: 1 }),
    ];

    const result = buildLeaderboard(rankings, breakdown);

    expect(result.rankings.map((r) => r.rank)).toEqual([1, 1]);
    expect(result.breakdown.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("treats a ranking with no matching breakdown row as zero counts", () => {
    const rankings = [
      makeRanking("a", { total_points: 5 }),
      makeRanking("b", { total_points: 5 }),
    ];
    // Only 'b' has accuracy counts; 'a' falls back to zeros and ranks below.
    const breakdown = [makeBreakdown("b", { total_points: 5, exact_count: 1 })];

    const result = buildLeaderboard(rankings, breakdown);

    expect(result.rankings.map((r) => [r.user_id, r.rank])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });
});
