"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TournamentStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

export function TournamentCreateForm() {
  const t = useTranslations("tournaments.management.form");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("tournaments.status");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    start_date: "",
    end_date: "",
    status: "upcoming" as TournamentStatus,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          sport: formData.sport,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("createFailed"));
      }

      const tournament = await response.json();
      router.push(`/tournaments/manage/${tournament.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("tournamentInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("tournamentName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("tournamentNamePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport">{t("sport")}</Label>
            <Input
              id="sport"
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              placeholder={t("sportPlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("startDate")}</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">{t("endDate")}</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{tCommon("labels.status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: TournamentStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">{tStatus("upcoming")}</SelectItem>
                <SelectItem value="active">{tStatus("active")}</SelectItem>
                <SelectItem value="completed">{tStatus("completed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("createTournament")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          {tCommon("actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
