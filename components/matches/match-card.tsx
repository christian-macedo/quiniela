import { MatchWithTeams } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";
import { Badge } from "@/components/ui/badge";
import { formatLocalDateTime } from "@/lib/utils/date";
import Link from "next/link";

interface MatchCardProps {
  match: MatchWithTeams;
}

export function MatchCard({ match }: MatchCardProps) {
  const isCompleted = match.status === "completed";
  const isLive = match.status === "in_progress";

  return (
    <Link href={`/${match.tournament_id}/matches/${match.id}`}>
      <Card className={`transition-colors hover:bg-muted/50 cursor-pointer ${isLive ? "border-green-500 border-2" : ""}`}>
        <CardContent className="p-6">
        <div className="space-y-4">
          {/* Match Info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {formatLocalDateTime(match.match_date)}
              </span>
              {match.multiplier > 1 && (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  {match.multiplier}x
                </Badge>
              )}
            </div>
            <Badge
              variant={isLive ? "default" : "outline"}
              className={isLive ? "bg-green-500" : ""}
            >
              {match.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <TeamBadge team={match.home_team} size="md" showName={true} />
            </div>

            {isCompleted && match.home_score !== null && match.away_score !== null ? (
              <div className="flex items-center gap-3 text-2xl font-bold">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">:</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="text-xl font-semibold text-muted-foreground">
                vs
              </div>
            )}

            <div className="flex-1 flex justify-end">
              <TeamBadge team={match.away_team} size="md" showName={true} />
            </div>
          </div>

          {/* Round */}
          {match.round && (
            <div className="text-center text-sm text-muted-foreground">
              {match.round}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
