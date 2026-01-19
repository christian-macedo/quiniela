"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit, Trophy } from "lucide-react";
import Link from "next/link";
import { formatLocalDateTime } from "@/lib/utils/date";
import { Team, MatchStatus } from "@/types/database";
import { ScoreMatchDialog } from "./score-match-dialog";

interface MatchWithTeams {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  round: string | null;
  multiplier: number;
  home_team: Team;
  away_team: Team;
}

interface MatchManagementCardProps {
  match: MatchWithTeams;
}

const statusColors: Record<MatchStatus, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function MatchManagementCard({ match }: MatchManagementCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`h-2 w-2 rounded-full ${statusColors[match.status]}`}
            />
            <Badge variant="outline">{statusLabels[match.status]}</Badge>
            {match.round && (
              <Badge variant="secondary" className="text-xs">
                {match.round}
              </Badge>
            )}
            {match.multiplier > 1 && (
              <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                ×{match.multiplier}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {/* Show Score button for scheduled/in-progress matches */}
            {(match.status === "scheduled" || match.status === "in_progress") && (
              <ScoreMatchDialog
                matchId={match.id}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                currentHomeScore={match.home_score}
                currentAwayScore={match.away_score}
                multiplier={match.multiplier}
              >
                <Button variant="ghost" size="icon" title="Score Match">
                  <Trophy className="h-4 w-4" />
                </Button>
              </ScoreMatchDialog>
            )}

            {/* Edit button always available */}
            <Link
              href={`/tournaments/manage/${match.tournament_id}/matches/${match.id}/edit`}
            >
              <Button variant="ghost" size="icon" title="Edit Match">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-right">
            <div className="font-semibold">{match.home_team.name}</div>
            <div className="text-sm text-muted-foreground">
              {match.home_team.short_name}
            </div>
          </div>

          <div className="px-6 text-center">
            {match.status === "completed" && match.home_score !== null && match.away_score !== null ? (
              <div className="text-2xl font-bold">
                {match.home_score} - {match.away_score}
              </div>
            ) : (
              <div className="text-xl font-semibold text-muted-foreground">
                vs
              </div>
            )}
          </div>

          <div className="flex-1 text-left">
            <div className="font-semibold">{match.away_team.name}</div>
            <div className="text-sm text-muted-foreground">
              {match.away_team.short_name}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatLocalDateTime(match.match_date)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
