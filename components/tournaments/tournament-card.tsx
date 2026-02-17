"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Tournament } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatLocalDate } from "@/lib/utils/date";

interface TournamentCardProps {
  tournament: Tournament;
}

const statusColors: Record<string, string> = {
  upcoming: "bg-info",
  active: "bg-success",
  completed: "bg-muted",
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const t = useTranslations("tournaments.status");
  return (
    <Link href={`/${tournament.id}`}>
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Status stripe at top */}
        <div className={`h-1 ${statusColors[tournament.status] || "bg-muted"}`} />
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="font-display uppercase tracking-tight">
              {tournament.name}
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {t(tournament.status as "upcoming" | "active" | "completed")}
            </Badge>
          </div>
          <CardDescription>
            {formatLocalDate(tournament.start_date)} - {formatLocalDate(tournament.end_date)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${statusColors[tournament.status] || "bg-muted"}`}
            />
            <span className="text-sm text-muted-foreground capitalize">{tournament.sport}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
