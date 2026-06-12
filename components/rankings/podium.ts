/**
 * Shared podium styling helpers for the rankings leaderboard and breakdown tables.
 */

export function getPodiumStyle(rank: number): string {
  if (rank === 1)
    return "border-l-4 border-l-gold bg-gradient-to-r from-[hsl(var(--gold)/0.15)] to-transparent";
  if (rank === 2)
    return "border-l-4 border-l-silver bg-gradient-to-r from-[hsl(var(--silver)/0.1)] to-transparent";
  if (rank === 3)
    return "border-l-4 border-l-bronze bg-gradient-to-r from-[hsl(var(--bronze)/0.1)] to-transparent";
  return "";
}

export function getRankColor(rank: number): string {
  if (rank === 1) return "text-gold";
  if (rank === 2) return "text-silver";
  if (rank === 3) return "text-bronze";
  return "text-muted-foreground";
}
