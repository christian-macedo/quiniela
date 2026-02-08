"use client";

import { useTranslations } from 'next-intl';
import { MatchWithTeams } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";
import { Badge } from "@/components/ui/badge";
import { formatLocalDateTime } from "@/lib/utils/date";
import { Zap } from "lucide-react";
import Link from "next/link";

interface MatchCardProps {
  match: MatchWithTeams;
}

export function MatchCard({ match }: MatchCardProps) {
  const t = useTranslations('matches.status');
  const tCommon = useTranslations('common');
  const isCompleted = match.status === "completed";
  const isLive = match.status === "in_progress";

  const homeWins = isCompleted && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
  const awayWins = isCompleted && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

  return (
    <Link href={`/${match.tournament_id}/matches/${match.id}`}>
      <Card className={`transition-all duration-200 hover:bg-muted/50 hover:-translate-y-0.5 cursor-pointer ${
        isLive ? "border-success border-2 shadow-[0_0_15px_hsl(var(--success)/0.15)]" : ""
      }`}>
        <CardContent className="p-6">
        <div className="space-y-4">
          {/* Match Info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {formatLocalDateTime(match.match_date)}
              </span>
              {match.multiplier > 1 && (
                <Badge variant="outline" className="text-warning border-warning">
                  <Zap className="h-3 w-3 mr-0.5" />
                  {match.multiplier}x
                </Badge>
              )}
            </div>
            <Badge
              variant={isLive ? "default" : "outline"}
              className={isLive ? "bg-success animate-pulse-live" : ""}
            >
              {t(match.status as 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled')}
            </Badge>
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between gap-4">
            <div className={`flex-1 ${homeWins ? "font-semibold" : ""}`}>
              <TeamBadge team={match.home_team} size="md" showName={true} />
            </div>

            {isCompleted && match.home_score !== null && match.away_score !== null ? (
              <div className="flex items-center gap-3 font-display text-3xl font-bold animate-score-pop">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">:</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="text-xl font-semibold text-muted-foreground">
                {tCommon('vs')}
              </div>
            )}

            <div className={`flex-1 flex justify-end ${awayWins ? "font-semibold" : ""}`}>
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
