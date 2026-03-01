"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trophy } from "lucide-react";
import { Team } from "@/types/database";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

interface ScoreMatchDialogProps {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  currentHomeScore?: number | null;
  currentAwayScore?: number | null;
  multiplier?: number;
  children?: React.ReactNode;
}

export function ScoreMatchDialog({
  matchId,
  homeTeam,
  awayTeam,
  currentHomeScore,
  currentAwayScore,
  multiplier = 1.0,
  children,
}: ScoreMatchDialogProps) {
  const router = useRouter();
  const t = useTranslations("matches.score");
  const tCommon = useTranslations("common");
  const toast = useFeatureToast("matches");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [homeScore, setHomeScore] = useState<string>(currentHomeScore?.toString() || "");
  const [awayScore, setAwayScore] = useState<string>(currentAwayScore?.toString() || "");

  const handleSubmit = async () => {
    setIsLoading(true);

    const homeScoreNum = parseInt(homeScore);
    const awayScoreNum = parseInt(awayScore);

    if (isNaN(homeScoreNum) || isNaN(awayScoreNum)) {
      toast.error("error.invalidScores");
      setIsLoading(false);
      return;
    }

    if (homeScoreNum < 0 || awayScoreNum < 0) {
      toast.error("error.negativeScores");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/matches/${matchId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_score: homeScoreNum,
          away_score: awayScoreNum,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to score match");
      }

      toast.success("success.scored");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("error.failedToScore");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="default">
            <Trophy className="mr-2 h-4 w-4" />
            {t("title")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="home_score">{homeTeam.name}</Label>
              <Input
                id="home_score"
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="0"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="away_score">{awayTeam.name}</Label>
              <Input
                id="away_score"
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="0"
                disabled={isLoading}
              />
            </div>
          </div>

          {multiplier > 1 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-500">
                {t("pointMultiplier", { multiplier })}
              </p>
              <p className="text-muted-foreground mt-1">{t("multiplierNote", { multiplier })}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
            <p className="font-medium">{t("scoringRules")}</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>
                {t("exactScore")}{" "}
                {multiplier > 1 && `(${3 * multiplier} ${t("ptsWithMultiplier", { multiplier })})`}
              </li>
              <li>
                {t("correctDifference")}{" "}
                {multiplier > 1 && `(${2 * multiplier} ${t("ptsWithMultiplier", { multiplier })})`}
              </li>
              <li>
                {t("correctWinner")}{" "}
                {multiplier > 1 && `(${1 * multiplier} ${t("ptsWithMultiplier", { multiplier })})`}
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{tCommon("cancel")}</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("submitButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
