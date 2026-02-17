"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { Team } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TeamBadge } from "@/components/teams/team-badge";
import { Loader2, Save, Trash2 } from "lucide-react";
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

interface TeamEditFormProps {
  team: Team;
}

export function TeamEditForm({ team }: TeamEditFormProps) {
  const router = useRouter();
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const toast = useFeatureToast("teams");

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: team.name,
    short_name: team.short_name,
    country_code: team.country_code || "",
    logo_url: team.logo_url || "",
  });

  const previewTeam: Team = {
    ...team,
    ...formData,
    country_code: formData.country_code || null,
    logo_url: formData.logo_url || null,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          short_name: formData.short_name,
          country_code: formData.country_code || null,
          logo_url: formData.logo_url || null,
        }),
      });

      if (!response.ok) {
        toast.error("error.failedToUpdate");
        return;
      }

      toast.success("success.updated");
      router.push(`/teams/${team.id}`);
      router.refresh();
    } catch (err) {
      console.error("Error updating team:", err);
      toast.error("common:error.generic");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        toast.error("error.failedToDelete");
        setIsDeleting(false);
        return;
      }

      toast.success("success.deleted");
      router.push("/teams");
      router.refresh();
    } catch (err) {
      console.error("Error deleting team:", err);
      toast.error("common:error.generic");
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t("form.preview")}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <TeamBadge team={previewTeam} size="lg" showName={true} />
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle>{t("form.teamInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("form.teamName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("form.teamNamePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_name">{t("form.shortName")}</Label>
            <Input
              id="short_name"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder={t("form.shortNamePlaceholder")}
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">{t("form.shortNameHelp")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country_code">{t("form.countryCode")}</Label>
            <Input
              id="country_code"
              value={formData.country_code}
              onChange={(e) =>
                setFormData({ ...formData, country_code: e.target.value.toUpperCase() })
              }
              placeholder={t("form.countryCodePlaceholder")}
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">{t("form.countryCodeHelp")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">{t("form.logoUrl")}</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder={t("form.logoUrlPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("form.logoUrlHelp")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("edit.deleteTeam")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("edit.deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("edit.deleteConfirmDescription", { name: team.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                {tCommon("actions.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("edit.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
