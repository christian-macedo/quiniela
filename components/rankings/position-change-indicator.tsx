"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { PositionChange } from "@/lib/utils/position-change";

export type { PositionChange };

interface PositionChangeIndicatorProps {
  change: PositionChange;
  className?: string;
}

/**
 * Small up / down / same indicator showing how a player's leaderboard position
 * moved after the most recently completed match. Direction (not just color)
 * conveys the meaning, and the icon carries an aria-label since it has no
 * accompanying visible text.
 */
export function PositionChangeIndicator({ change, className }: PositionChangeIndicatorProps) {
  const t = useTranslations("rankings.positionChange");

  if (change === "up") {
    return (
      <ArrowUp
        className={`h-4 w-4 text-emerald-600 dark:text-emerald-400 ${className ?? ""}`}
        aria-label={t("up")}
      />
    );
  }

  if (change === "down") {
    return (
      <ArrowDown
        className={`h-4 w-4 text-destructive ${className ?? ""}`}
        aria-label={t("down")}
      />
    );
  }

  return (
    <Minus
      className={`h-4 w-4 text-muted-foreground ${className ?? ""}`}
      aria-label={t("same")}
    />
  );
}
