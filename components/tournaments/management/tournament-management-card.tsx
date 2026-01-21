"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Tournament } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLocalDate } from "@/lib/utils/date";
import { Pencil, Eye, Users, Calendar } from "lucide-react";

interface TournamentManagementCardProps {
  tournament: Tournament;
  teamCount: number;
  matchCount: number;
}

const statusColors = {
  upcoming: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
};

export function TournamentManagementCard({ 
  tournament, 
  teamCount, 
  matchCount 
}: TournamentManagementCardProps) {
  const t = useTranslations("tournaments.card");
  const tStatus = useTranslations("tournaments.status");
  const tLabels = useTranslations("common.labels");

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColors[tournament.status]}`} />
            <Badge variant="outline" className="capitalize">
              {tStatus(tournament.status)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Link href={`/tournaments/manage/${tournament.id}`}>
              <Button variant="outline" size="icon" title={t("viewDetails")}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/tournaments/manage/${tournament.id}/edit`}>
              <Button variant="outline" size="icon" title={t("editTournament")}>
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="mb-2">{tournament.name}</CardTitle>
        <CardDescription className="mb-4">
          {formatLocalDate(tournament.start_date)} - {formatLocalDate(tournament.end_date)}
        </CardDescription>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{teamCount} {teamCount === 1 ? t("team") : t("teams")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{matchCount} {matchCount === 1 ? tLabels("match") : tLabels("matches")}</span>
          </div>
          <Badge variant="secondary" className="capitalize">
            {tournament.sport}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
