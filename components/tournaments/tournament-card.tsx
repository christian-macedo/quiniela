"use client";

import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Tournament } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatLocalDate } from "@/lib/utils/date";

interface TournamentCardProps {
  tournament: Tournament;
}

const statusColors = {
  upcoming: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const t = useTranslations('tournaments.status');
  return (
    <Link href={`/${tournament.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>{tournament.name}</CardTitle>
            <Badge variant="outline" className="capitalize">
              {t(tournament.status as 'upcoming' | 'active' | 'completed')}
            </Badge>
          </div>
          <CardDescription>
            {formatLocalDate(tournament.start_date)} -{" "}
            {formatLocalDate(tournament.end_date)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${statusColors[tournament.status]}`}
            />
            <span className="text-sm text-muted-foreground capitalize">
              {tournament.sport}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
