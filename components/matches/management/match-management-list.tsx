"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { MatchManagementCard } from "./match-management-card";
import { Team, MatchStatus } from "@/types/database";

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

interface MatchManagementListProps {
  matches: MatchWithTeams[];
}

export function MatchManagementList({ matches }: MatchManagementListProps) {
  const t = useTranslations('matches');
  const tCommon = useTranslations('common');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");

  // Get unique rounds from matches
  const rounds = useMemo(() => {
    const uniqueRounds = new Set<string>();
    matches.forEach((match) => {
      if (match.round) {
        uniqueRounds.add(match.round);
      }
    });
    return Array.from(uniqueRounds).sort();
  }, [matches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // Search filter (team names)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          match.home_team.name.toLowerCase().includes(query) ||
          match.home_team.short_name.toLowerCase().includes(query) ||
          match.away_team.name.toLowerCase().includes(query) ||
          match.away_team.short_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && match.status !== statusFilter) {
        return false;
      }

      // Round filter
      if (roundFilter !== "all" && match.round !== roundFilter) {
        return false;
      }

      return true;
    });
  }, [matches, searchQuery, statusFilter, roundFilter]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || roundFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRoundFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('management.searchTeams')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('management.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('filters.allStatuses')}</SelectItem>
              <SelectItem value="scheduled">{t('status.scheduled')}</SelectItem>
              <SelectItem value="in_progress">{t('status.in_progress')}</SelectItem>
              <SelectItem value="completed">{t('status.completed')}</SelectItem>
              <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>

          {rounds.length > 0 && (
            <Select value={roundFilter} onValueChange={setRoundFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('management.filterByRound')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('management.allRounds')}</SelectItem>
                {rounds.map((round) => (
                  <SelectItem key={round} value={round}>
                    {round}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{tCommon('filters.activeFilters')}:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                {tCommon('filters.search')}: {searchQuery}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {tCommon('labels.status')}: {t(`status.${statusFilter}`)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setStatusFilter("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {roundFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {t('details.round')}: {roundFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:text-destructive"
                  onClick={() => setRoundFilter("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm"
              onClick={clearFilters}
            >
              {tCommon('actions.clearAll')}
            </Button>
          </div>
        )}

        {/* Results counter */}
        <p className="text-sm text-muted-foreground">
          {t('management.showingMatches', { showing: filteredMatches.length, total: matches.length })}
        </p>
      </div>

      {/* Matches grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <MatchManagementCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? t('management.noMatchesFiltered')
              : t('management.noMatchesYet')}
          </p>
        </div>
      )}
    </div>
  );
}
