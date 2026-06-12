"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BreakdownWithPublicUser } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getPublicUserDisplay, getPublicUserInitials } from "@/lib/utils/privacy";
import { getPodiumStyle, getRankColor } from "@/components/rankings/podium";

interface BreakdownTableProps {
  breakdown: BreakdownWithPublicUser[];
  currentUserId?: string;
  tournamentId: string;
}

export function BreakdownTable({ breakdown, currentUserId, tournamentId }: BreakdownTableProps) {
  const t = useTranslations("rankings");
  const tCommon = useTranslations("common");
  const router = useRouter();

  if (breakdown.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("noRankings")}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("breakdown.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-8 px-2 py-2 text-center font-medium">
                  {tCommon("labels.rank")}
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  {tCommon("labels.name")}
                </th>
                <th scope="col" className="px-2 py-2 text-center font-medium">
                  {t("breakdown.exact")}
                </th>
                <th scope="col" className="px-2 py-2 text-center font-medium">
                  {t("breakdown.goalDiff")}
                </th>
                <th scope="col" className="px-2 py-2 text-center font-medium">
                  {t("breakdown.winner")}
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  {tCommon("labels.points")}
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row, index) => {
                const isCurrentUser = row.user_id === currentUserId;
                const position = index + 1;
                const href = `/${tournamentId}/rankings/${row.user_id}`;

                return (
                  <tr
                    key={row.user_id}
                    onClick={() => router.push(href)}
                    className={`border-b last:border-b-0 cursor-pointer transition-colors ${getPodiumStyle(
                      position
                    )} ${
                      isCurrentUser ? "ring-2 ring-inset ring-primary/30 bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    {/* Position */}
                    <td className="w-8 px-2 py-3 text-center">
                      <span className={`font-display text-xl font-bold ${getRankColor(position)}`}>
                        {position}
                      </span>
                    </td>

                    {/* Player */}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={row.user.avatar_url ?? undefined} />
                          <AvatarFallback>{getPublicUserInitials(row.user)}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium hover:underline"
                          >
                            {getPublicUserDisplay(row.user)}
                          </Link>
                          {isCurrentUser && (
                            <Badge variant="outline" className="hidden sm:inline-flex">
                              {t("you")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Exact */}
                    <td className="px-2 py-3 text-center font-display font-bold tabular-nums">
                      {row.exact_count}
                    </td>

                    {/* Goal difference */}
                    <td className="px-2 py-3 text-center font-display font-bold tabular-nums">
                      {row.goal_diff_count}
                    </td>

                    {/* Winner */}
                    <td className="px-2 py-3 text-center font-display font-bold tabular-nums">
                      {row.winner_count}
                    </td>

                    {/* Points */}
                    <td className="px-2 py-3 text-right">
                      <Badge variant="secondary">
                        <span className="font-display font-bold">{row.total_points}</span>
                        <span className="ml-1">{tCommon("labels.pts")}</span>
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
