"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, X } from "lucide-react";
import { PredictionForm } from "@/components/predictions/prediction-form";
import { MatchWithTeams, Prediction, Team } from "@/types/database";
import { formatLocalDate } from "@/lib/utils/date";

interface UpcomingMatchesFiltersProps {
  matches: MatchWithTeams[];
  predictions: Record<string, Prediction>;
  onSubmitPrediction: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
}

const DATE_KEY_FORMAT = "yyyy-MM-dd";

export function UpcomingMatchesFilters({
  matches,
  predictions,
  onSubmitPrediction,
}: UpcomingMatchesFiltersProps) {
  const t = useTranslations("predictions");
  const tCommon = useTranslations("common");

  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [emptyOnly, setEmptyOnly] = useState(false);

  // Unique teams across all upcoming matches, sorted by name
  const teams = useMemo(() => {
    const byId = new Map<string, Team>();
    matches.forEach((match) => {
      byId.set(match.home_team.id, match.home_team);
      byId.set(match.away_team.id, match.away_team);
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  // Unique match dates (keyed by local calendar day), sorted ascending
  const dates = useMemo(() => {
    const byKey = new Map<string, string>();
    matches.forEach((match) => {
      const key = formatLocalDate(match.match_date, DATE_KEY_FORMAT);
      if (!byKey.has(key)) {
        byKey.set(key, formatLocalDate(match.match_date));
      }
    });
    return Array.from(byKey.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));
  }, [matches]);

  // Unique round labels, sorted
  const rounds = useMemo(() => {
    const unique = new Set<string>();
    matches.forEach((match) => {
      if (match.round) unique.add(match.round);
    });
    return Array.from(unique).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (
        teamFilter !== "all" &&
        match.home_team_id !== teamFilter &&
        match.away_team_id !== teamFilter
      ) {
        return false;
      }
      if (
        dateFilter !== "all" &&
        formatLocalDate(match.match_date, DATE_KEY_FORMAT) !== dateFilter
      ) {
        return false;
      }
      if (roundFilter !== "all" && match.round !== roundFilter) {
        return false;
      }
      // "Empty" = no prediction record exists for this match yet
      if (emptyOnly && predictions[match.id]) {
        return false;
      }
      return true;
    });
  }, [matches, teamFilter, dateFilter, roundFilter, emptyOnly, predictions]);

  const hasActiveFilters =
    teamFilter !== "all" || dateFilter !== "all" || roundFilter !== "all" || emptyOnly;

  const clearFilters = () => {
    setTeamFilter("all");
    setDateFilter("all");
    setRoundFilter("all");
    setEmptyOnly(false);
  };

  const selectedTeamName = teams.find((team) => team.id === teamFilter)?.name;
  const selectedDateLabel = dates.find((date) => date.key === dateFilter)?.label;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t("filters.heading")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("filters.description")}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filters.filterByTeam")}>
              <SelectValue placeholder={t("filters.filterByTeam")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allTeams")}</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filters.filterByDate")}>
              <SelectValue placeholder={t("filters.filterByDate")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allDates")}</SelectItem>
              {dates.map((date) => (
                <SelectItem key={date.key} value={date.key}>
                  {date.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {rounds.length > 0 && (
            <Select value={roundFilter} onValueChange={setRoundFilter}>
              <SelectTrigger
                className="w-full sm:w-[200px]"
                aria-label={t("filters.filterByRound")}
              >
                <SelectValue placeholder={t("filters.filterByRound")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allRounds")}</SelectItem>
                {rounds.map((round) => (
                  <SelectItem key={round} value={round}>
                    {round}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2 sm:h-10">
            <input
              type="checkbox"
              id="empty-predictions-only"
              checked={emptyOnly}
              onChange={(e) => setEmptyOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="empty-predictions-only" className="cursor-pointer">
              {t("filters.emptyOnly")}
            </Label>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {tCommon("filters.activeFilters")}:
            </span>
            {teamFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {t("filters.team")}: {selectedTeamName}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setTeamFilter("all")}
                  aria-label={t("filters.removeTeamFilter")}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              </Badge>
            )}
            {dateFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {tCommon("labels.date")}: {selectedDateLabel}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setDateFilter("all")}
                  aria-label={t("filters.removeDateFilter")}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              </Badge>
            )}
            {roundFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {t("filters.round")}: {roundFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setRoundFilter("all")}
                  aria-label={t("filters.removeRoundFilter")}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              </Badge>
            )}
            {emptyOnly && (
              <Badge variant="secondary" className="gap-1">
                {t("filters.emptyOnly")}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setEmptyOnly(false)}
                  aria-label={t("filters.removeEmptyFilter")}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              </Badge>
            )}
            <Button variant="link" size="sm" className="h-auto p-0 text-sm" onClick={clearFilters}>
              {tCommon("actions.clearAll")}
            </Button>
          </div>
        )}

        {/* Results counter */}
        <p className="text-sm text-muted-foreground">
          {tCommon("filters.showingOf", {
            showing: filteredMatches.length,
            total: matches.length,
            item: tCommon("labels.matches"),
          })}
        </p>
      </div>

      {/* Matches grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((match) => (
            <PredictionForm
              key={match.id}
              match={match}
              existingPrediction={predictions[match.id]}
              onSubmit={(home, away) => onSubmitPrediction(match.id, home, away)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">{t("filters.noMatchesFiltered")}</p>
        </div>
      )}
    </div>
  );
}
