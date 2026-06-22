import { Match, MatchStatus } from "@/types/database";
import { isPastDate } from "@/lib/utils/date";

/**
 * Effective, display-time match status.
 *
 * A "scheduled" match whose start time has passed is presented as "in_progress"
 * without mutating the stored status. All other stored statuses pass through.
 *
 * "in_progress" is a derived, display-only state — it is never stored. See the
 * tightened `matches_status_check` constraint, which only permits
 * 'scheduled' | 'completed' | 'cancelled'.
 */
export function getEffectiveMatchStatus(match: Pick<Match, "status" | "match_date">): MatchStatus {
  if (match.status === "scheduled" && isPastDate(match.match_date)) {
    return "in_progress";
  }
  return match.status;
}
