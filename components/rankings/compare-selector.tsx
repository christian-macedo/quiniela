"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { RankingWithPublicUser } from "@/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublicUserDisplay } from "@/lib/utils/privacy";

interface CompareSelectorProps {
  /** Leaderboard rows used to populate the picker (current user is filtered out). */
  participants: RankingWithPublicUser[];
  currentUserId: string;
  /** Currently selected opponent, if any. */
  selectedOpponentId?: string;
}

/**
 * Lets the current user pick a single opponent to compare against. Selecting an
 * opponent navigates to `?opponent=<userId>` so the server component re-renders
 * with securely-fetched, completed-match-only data.
 */
export function CompareSelector({
  participants,
  currentUserId,
  selectedOpponentId,
}: CompareSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("rankings.compare");
  const tCommon = useTranslations("common");

  const opponents = participants.filter((p) => p.user_id !== currentUserId);

  function handleSelect(opponentId: string) {
    router.push(`${pathname}?opponent=${opponentId}`);
  }

  return (
    <div className="max-w-sm">
      <label htmlFor="compare-opponent" className="mb-2 block text-sm font-medium">
        {t("selectLabel")}
      </label>
      <Select value={selectedOpponentId} onValueChange={handleSelect}>
        <SelectTrigger id="compare-opponent" aria-label={t("selectLabel")}>
          <SelectValue placeholder={t("selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {opponents.map((opponent) => (
            <SelectItem key={opponent.user_id} value={opponent.user_id}>
              <span className="flex w-full items-center gap-2">
                <span className="tabular-nums text-muted-foreground">#{opponent.rank}</span>
                <span className="flex-1 truncate">{getPublicUserDisplay(opponent.user)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {opponent.total_points} {tCommon("labels.pts")}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {opponents.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">{t("noOpponents")}</p>
      )}
    </div>
  );
}
