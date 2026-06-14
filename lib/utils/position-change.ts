/**
 * Position-change direction for a leaderboard row, comparing a player's current
 * standing to where they sat before the most recently completed match.
 */
export type PositionChange = "up" | "down" | "same";

/**
 * Compare a player's previous rank/position to their current one. Lower values
 * are better (rank 1 beats rank 2), so a larger previous value means the player
 * has since climbed. A missing previous value means the player is a new entrant
 * since the latest match and is treated as having moved up.
 */
export function comparePosition(
  previous: number | undefined,
  current: number
): PositionChange {
  if (previous === undefined) return "up";
  if (previous > current) return "up";
  if (previous < current) return "down";
  return "same";
}
