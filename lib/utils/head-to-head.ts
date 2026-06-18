/**
 * Head-to-head tally between the current user and a selected opponent.
 *
 * Only completed matches that BOTH users predicted count toward the tally, so a
 * match where one side has no prediction is ignored (it isn't a fair contest).
 * For each such match, whoever earned more `points_earned` "wins" that match;
 * equal points is a tie.
 */

import type { PredictionWithMatch } from "@/types/database";

export interface HeadToHeadResult {
  /** Matches the current user scored higher than the opponent. */
  youWon: number;
  /** Matches the opponent scored higher than the current user. */
  opponentWon: number;
  /** Matches where both earned the same points. */
  ties: number;
  /** Completed matches both users predicted (youWon + opponentWon + ties). */
  total: number;
}

/**
 * Compute the head-to-head tally from each user's completed-match predictions.
 * Both lists should already be limited to completed matches; matches present for
 * only one user are skipped.
 */
export function computeHeadToHead(
  yourPredictions: PredictionWithMatch[],
  opponentPredictions: PredictionWithMatch[]
): HeadToHeadResult {
  const opponentByMatch = new Map(opponentPredictions.map((p) => [p.match_id, p]));

  const result: HeadToHeadResult = { youWon: 0, opponentWon: 0, ties: 0, total: 0 };

  for (const yours of yourPredictions) {
    if (yours.match.status !== "completed") continue;
    const theirs = opponentByMatch.get(yours.match_id);
    if (!theirs || theirs.match.status !== "completed") continue;

    result.total += 1;
    if (yours.points_earned > theirs.points_earned) {
      result.youWon += 1;
    } else if (yours.points_earned < theirs.points_earned) {
      result.opponentWon += 1;
    } else {
      result.ties += 1;
    }
  }

  return result;
}
