"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { BreakdownTable } from "@/components/rankings/breakdown-table";
import { RankingWithPublicUser } from "@/types/database";
import { RankedBreakdown } from "@/lib/utils/leaderboard";

interface RankingsTabsProps {
  rankings: RankingWithPublicUser[];
  breakdown: RankedBreakdown[];
  currentUserId?: string;
  tournamentId: string;
}

export function RankingsTabs({
  rankings,
  breakdown,
  currentUserId,
  tournamentId,
}: RankingsTabsProps) {
  const t = useTranslations("rankings");

  return (
    <Tabs defaultValue="leaderboard">
      <TabsList>
        <TabsTrigger value="leaderboard">{t("breakdown.tabLeaderboard")}</TabsTrigger>
        <TabsTrigger value="breakdown">{t("breakdown.tabBreakdown")}</TabsTrigger>
      </TabsList>
      <TabsContent value="leaderboard">
        <RankingsTable
          rankings={rankings}
          currentUserId={currentUserId}
          tournamentId={tournamentId}
        />
      </TabsContent>
      <TabsContent value="breakdown">
        <BreakdownTable
          breakdown={breakdown}
          currentUserId={currentUserId}
          tournamentId={tournamentId}
        />
      </TabsContent>
    </Tabs>
  );
}
