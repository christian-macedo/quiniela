"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Team } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";
import { Button } from "@/components/ui/button";
import { Pencil, Eye } from "lucide-react";

interface TeamManagementCardProps {
  team: Team;
}

export function TeamManagementCard({ team }: TeamManagementCardProps) {
  const t = useTranslations("teams.card");

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <TeamBadge team={team} size="lg" showName={false} />
          <div className="flex gap-2">
            <Link href={`/teams/${team.id}`}>
              <Button variant="outline" size="icon" title={t("viewDetails")}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/teams/${team.id}/edit`}>
              <Button variant="outline" size="icon" title={t("editTeam")}>
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="mb-2">{team.name}</CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {t("shortName")}: {team.short_name}
          </p>
          {team.country_code && (
            <p>
              {t("country")}: {team.country_code}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
