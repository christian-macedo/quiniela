"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Team } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TeamBadge } from "@/components/teams/team-badge";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

export function TeamCreateForm() {
  const t = useTranslations("teams.form");
  const tCommon = useTranslations("common");
  const toast = useFeatureToast("teams");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    country_code: "",
    logo_url: "",
  });

  const previewTeam: Team = {
    id: "preview",
    name: formData.name || t("defaultName"),
    short_name: formData.short_name || t("defaultShortName"),
    country_code: formData.country_code || null,
    logo_url: formData.logo_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          short_name: formData.short_name,
          country_code: formData.country_code || null,
          logo_url: formData.logo_url || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("createFailed"));
      }

      const team = await response.json();
      toast.success("success.created");
      router.push(`/teams/${team.id}`);
      router.refresh();
    } catch (err) {
      console.error("Error creating team:", err);
      toast.error("error.failedToCreate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{tCommon("labels.preview")}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <TeamBadge team={previewTeam} size="lg" showName={true} />
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle>{t("teamInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("teamName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("teamNamePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_name">{t("shortName")}</Label>
            <Input
              id="short_name"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder={t("shortNamePlaceholder")}
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">{t("shortNameHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country_code">{t("countryCode")}</Label>
            <Input
              id="country_code"
              value={formData.country_code}
              onChange={(e) =>
                setFormData({ ...formData, country_code: e.target.value.toUpperCase() })
              }
              placeholder={t("countryCodePlaceholder")}
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">{t("countryCodeHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">{t("logoUrl")}</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">{t("logoUrlHint")}</p>
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
          {t("createTeam")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          {tCommon("actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
