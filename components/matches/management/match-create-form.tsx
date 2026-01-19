"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Team, MatchStatus } from "@/types/database";

interface MatchCreateFormProps {
  tournamentId: string;
  teams: Team[];
}

export function MatchCreateForm({ tournamentId, teams }: MatchCreateFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    home_team_id: "",
    away_team_id: "",
    match_date: "",
    round: "",
    status: "scheduled" as MatchStatus,
    multiplier: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create match");
      }

      router.push(`/tournaments/manage/${tournamentId}/matches`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setIsLoading(false);
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
        <CardTitle>Create Match</CardTitle>
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
              <Label htmlFor="home_team_id">Home Team *</Label>
              <Select
                value={formData.home_team_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, home_team_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select home team" />
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
              <Label htmlFor="away_team_id">Away Team *</Label>
              <Select
                value={formData.away_team_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, away_team_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select away team" />
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
              <Label htmlFor="match_date">Match Date & Time *</Label>
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
              <Label htmlFor="round">Round/Stage</Label>
              <Input
                id="round"
                value={formData.round}
                onChange={(e) =>
                  setFormData({ ...formData, round: e.target.value })
                }
                placeholder="e.g., Group A, Round of 16, Final"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiplier">Point Multiplier</Label>
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
                Multiply points (1 = normal, 2 = double, 3 = triple)
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Match
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
      </CardContent>
    </Card>
  );
}
