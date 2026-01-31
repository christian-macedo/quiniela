"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { Team, MatchStatus } from "@/types/database";
import { ScoreMatchDialog } from "./score-match-dialog";

interface MatchWithTeams {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  round: string | null;
  multiplier: number;
  home_team: Team;
  away_team: Team;
}

interface MatchEditFormProps {
  match: MatchWithTeams;
  teams: Team[];
}

export function MatchEditForm({ match, teams }: MatchEditFormProps) {
  const router = useRouter();
  const t = useTranslations("matches.form");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("matches.status");
  const tMessages = useTranslations("messages");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tournament_id: match.tournament_id,
    home_team_id: match.home_team_id,
    away_team_id: match.away_team_id,
    match_date: match.match_date.split("T")[0] + "T" + match.match_date.split("T")[1]?.substring(0, 5) || "",
    round: match.round || "",
    status: match.status,
    multiplier: match.multiplier || 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || tMessages('matches.updateFailed'));
      }

      toast.success(tMessages('matches.updateSuccess'));
      router.push(`/tournaments/manage/${match.tournament_id}/matches`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : tMessages('matches.updateFailed');
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${match.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || tMessages('matches.deleteFailed'));
      }

      toast.success(tMessages('matches.deleteSuccess'));
      router.push(`/tournaments/manage/${match.tournament_id}/matches`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : tMessages('matches.deleteFailed');
      toast.error(message);
      setError(message);
      setIsDeleting(false);
    }
  };

  // Filter available teams based on selection
  const availableHomeTeams = teams.filter(
    (team) => team.id !== formData.away_team_id
  );
  const availableAwayTeams = teams.filter(
    (team) => team.id !== formData.home_team_id
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("editMatch")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="home_team_id">{t("homeTeam")} *</Label>
              <Select
                value={formData.home_team_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, home_team_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectHomeTeam")} />
                </SelectTrigger>
                <SelectContent>
                  {availableHomeTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.short_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="away_team_id">{t("awayTeam")} *</Label>
              <Select
                value={formData.away_team_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, away_team_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectAwayTeam")} />
                </SelectTrigger>
                <SelectContent>
                  {availableAwayTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.short_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_date">{t("matchDateTime")} *</Label>
              <Input
                id="match_date"
                type="datetime-local"
                value={formData.match_date}
                onChange={(e) =>
                  setFormData({ ...formData, match_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="round">{t("roundStage")}</Label>
              <Input
                id="round"
                value={formData.round}
                onChange={(e) =>
                  setFormData({ ...formData, round: e.target.value })
                }
                placeholder={t("roundPlaceholder")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">{t("status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as MatchStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{tStatus("scheduled")}</SelectItem>
                  <SelectItem value="in_progress">{tStatus("inProgress")}</SelectItem>
                  <SelectItem value="completed">{tStatus("completed")}</SelectItem>
                  <SelectItem value="cancelled">{tStatus("cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiplier">{t("pointMultiplier")}</Label>
              <Input
                id="multiplier"
                type="number"
                min="1"
                max="3"
                step="1"
                value={formData.multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    multiplier: parseInt(e.target.value) || 1,
                  })
                }
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                {t("multiplierHelp")}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || isDeleting}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("saveChanges")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading || isDeleting}
              >
                {tCommon("cancel")}
              </Button>
            </div>

            <div className="flex gap-4 sm:ml-auto">
              {/* Score Match Button */}
              <ScoreMatchDialog
                matchId={match.id}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                currentHomeScore={match.home_score}
                currentAwayScore={match.away_score}
                multiplier={match.multiplier}
              />

              {/* Delete Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isLoading || isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {t("deleteMatch")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteConfirmDescription", {
                        homeTeam: match.home_team.name,
                        awayTeam: match.away_team.name,
                      })}
                      {match.status === "completed" && (
                        <span className="block mt-2 text-destructive font-semibold">
                          {t("deleteCompletedWarning")}
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {tCommon("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
