/**
 * Shared leaderboard sorting used by both the overall leaderboard card and the
 * accuracy breakdown card, so every standing is ordered the same way.
 *
 * Ranking criteria, in order:
 *   1. Most total points
 *   2. Most exact scores
 *   3. Most correct winner + goal difference
 *   4. Most correct winner
 *
 * Participants that remain tied after all four criteria share the same rank
 * (standard competition ranking, e.g. 1, 2, 2, 4).
 */

import type { BreakdownWithPublicUser, RankingWithPublicUser } from "@/types/database";

export interface LeaderboardSortStats {
  total_points: number;
  exact_count: number;
  goal_diff_count: number;
  winner_count: number;
}

/** Breakdown row enriched with its computed shared rank. */
export type RankedBreakdown = BreakdownWithPublicUser & { rank: number };

/**
 * Comparator implementing the leaderboard criteria. Returns a negative number
 * when `a` should rank ahead of `b`. A return of `0` means a perfect tie across
 * every criterion (the two share a position).
 */
export function compareLeaderboard(a: LeaderboardSortStats, b: LeaderboardSortStats): number {
  return (
    b.total_points - a.total_points ||
    b.exact_count - a.exact_count ||
    b.goal_diff_count - a.goal_diff_count ||
    b.winner_count - a.winner_count
  );
}

/**
 * Sort `items` by the leaderboard criteria and attach a shared `rank`. Tied
 * entries receive the same rank and the next distinct entry skips ahead
 * (1, 2, 2, 4). The original array is not mutated.
 */
export function assignRanks<T>(
  items: T[],
  stats: (item: T) => LeaderboardSortStats
): (T & { rank: number })[] {
  const sorted = items.slice().sort((a, b) => compareLeaderboard(stats(a), stats(b)));

  let currentRank = 0;
  return sorted.map((item, index) => {
    if (index === 0 || compareLeaderboard(stats(sorted[index - 1]), stats(item)) !== 0) {
      currentRank = index + 1;
    }
    return { ...item, rank: currentRank };
  });
}

/**
 * Produce consistently-sorted standings for both leaderboard cards. The overall
 * rankings are enriched with each player's accuracy counts (from the breakdown)
 * so both lists order — and rank — identical players identically.
 */
export function buildLeaderboard(
  rankings: RankingWithPublicUser[],
  breakdown: BreakdownWithPublicUser[]
): { rankings: RankingWithPublicUser[]; breakdown: RankedBreakdown[] } {
  const countsByUser = new Map(breakdown.map((b) => [b.user_id, b] as const));

  const statsForRanking = (r: RankingWithPublicUser): LeaderboardSortStats => {
    const counts = countsByUser.get(r.user_id);
    return {
      total_points: r.total_points,
      exact_count: counts?.exact_count ?? 0,
      goal_diff_count: counts?.goal_diff_count ?? 0,
      winner_count: counts?.winner_count ?? 0,
    };
  };

  return {
    rankings: assignRanks(rankings, statsForRanking),
    breakdown: assignRanks(breakdown, (b) => b),
  };
}
