"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState<string>(
    currentHomeScore?.toString() || ""
  );
  const [awayScore, setAwayScore] = useState<string>(
    currentAwayScore?.toString() || ""
  );

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    const homeScoreNum = parseInt(homeScore);
    const awayScoreNum = parseInt(awayScore);

    if (isNaN(homeScoreNum) || isNaN(awayScoreNum)) {
      setError("Please enter valid scores");
      setIsLoading(false);
      return;
    }

    if (homeScoreNum < 0 || awayScoreNum < 0) {
      setError("Scores cannot be negative");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/matches/${matchId}/score`, {
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

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score match");
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
            Score Match
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Score Match</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the final score for this match. This will calculate points for
            all predictions and update tournament rankings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

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
                Point Multiplier: ×{multiplier}
              </p>
              <p className="text-muted-foreground mt-1">
                Points will be multiplied by {multiplier} for this match
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
            <p className="font-medium">Scoring Rules:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Exact score: 3 points {multiplier > 1 && `(${3 * multiplier} pts with ×${multiplier})`}</li>
              <li>Correct score difference: 2 points {multiplier > 1 && `(${2 * multiplier} pts with ×${multiplier})`}</li>
              <li>Correct winner: 1 point {multiplier > 1 && `(${1 * multiplier} pts with ×${multiplier})`}</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Score Match & Calculate Points
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
