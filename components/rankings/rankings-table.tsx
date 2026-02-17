"use client";

import { useTranslations } from "next-intl";
import { RankingWithUser } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface RankingsTableProps {
  rankings: RankingWithUser[];
  currentUserId?: string;
  tournamentId: string;
}

function getPodiumStyle(rank: number): string {
  if (rank === 1)
    return "border-l-4 border-l-gold bg-gradient-to-r from-[hsl(var(--gold)/0.15)] to-transparent";
  if (rank === 2)
    return "border-l-4 border-l-silver bg-gradient-to-r from-[hsl(var(--silver)/0.1)] to-transparent";
  if (rank === 3)
    return "border-l-4 border-l-bronze bg-gradient-to-r from-[hsl(var(--bronze)/0.1)] to-transparent";
  return "";
}

function getRankColor(rank: number): string {
  if (rank === 1) return "text-gold";
  if (rank === 2) return "text-silver";
  if (rank === 3) return "text-bronze";
  return "text-muted-foreground";
}

export function RankingsTable({ rankings, currentUserId, tournamentId }: RankingsTableProps) {
  const t = useTranslations("rankings");
  const tCommon = useTranslations("common");

  if (rankings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("noRankings")}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Column Headers */}
        <div className="flex items-center gap-4 px-3 pb-3 mb-2 border-b text-xs uppercase tracking-wider text-muted-foreground font-medium">
          <div className="w-8 text-center">{tCommon("labels.rank")}</div>
          <div className="w-10" />
          <div className="flex-1">{tCommon("labels.name")}</div>
          <div>{tCommon("labels.points")}</div>
        </div>

        <div className="space-y-2">
          {rankings.map((ranking, index) => {
            const isCurrentUser = ranking.user_id === currentUserId;
            const displayRank = ranking.rank ?? index + 1;

            return (
              <Link key={ranking.user_id} href={`/${tournamentId}/rankings/${ranking.user_id}`}>
                <div
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer ${
                    index < 5 ? `animate-slide-up stagger-${Math.min(index + 1, 5)}` : ""
                  } ${getPodiumStyle(displayRank)} ${
                    isCurrentUser
                      ? "ring-2 ring-primary/30 bg-primary/10 hover:bg-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    <span
                      className={`font-display text-2xl font-bold ${getRankColor(displayRank)}`}
                    >
                      {displayRank}
                    </span>
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={ranking.user.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {ranking.user.screen_name?.[0]?.toUpperCase() ??
                        ranking.user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="font-medium hover:underline">
                      {ranking.user.screen_name ?? ranking.user.email}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <span className="font-display font-bold">{ranking.total_points}</span>
                      <span className="ml-1">{tCommon("labels.pts")}</span>
                    </Badge>
                    {isCurrentUser && <Badge variant="outline">{t("you")}</Badge>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
