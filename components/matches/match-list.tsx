"use client";

import { MatchWithTeams } from "@/types/database";
import { MatchCard } from "./match-card";
import { useTranslations } from "next-intl";

interface MatchListProps {
  matches: MatchWithTeams[];
}

export function MatchList({ matches }: MatchListProps) {
  const t = useTranslations("matches");

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("noMatches")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
