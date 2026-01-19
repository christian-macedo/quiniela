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

export function TeamCreateForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    country_code: "",
    logo_url: "",
  });

  const previewTeam: Team = {
    id: "preview",
    name: formData.name || "Team Name",
    short_name: formData.short_name || "TEAM",
    country_code: formData.country_code || null,
    logo_url: formData.logo_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

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
        throw new Error(data.error || "Failed to create team");
      }

      const team = await response.json();
      router.push(`/teams/${team.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <TeamBadge team={previewTeam} size="lg" showName={true} />
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Manchester United"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_name">Short Name</Label>
            <Input
              id="short_name"
              value={formData.short_name}
              onChange={(e) =>
                setFormData({ ...formData, short_name: e.target.value })
              }
              placeholder="e.g., MAN UTD"
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              Used for display in compact views (max 10 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country_code">Country Code</Label>
            <Input
              id="country_code"
              value={formData.country_code}
              onChange={(e) =>
                setFormData({ ...formData, country_code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., GB"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              ISO country code (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) =>
                setFormData({ ...formData, logo_url: e.target.value })
              }
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              URL to the team logo image (optional)
            </p>
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
          Create Team
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
