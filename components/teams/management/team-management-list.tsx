"use client";

import { Team } from "@/types/database";
import { TeamManagementCard } from "./team-management-card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from 'next-intl';

interface Tournament {
  id: string;
  name: string;
}

interface TeamManagementListProps {
  teams: Team[];
  tournaments: Tournament[];
  teamTournamentMap: Record<string, string[]>;
  countryCodes: string[];
}

export function TeamManagementList({ 
  teams, 
  tournaments, 
  teamTournamentMap, 
  countryCodes 
}: TeamManagementListProps) {
  const t = useTranslations('teams');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedTournament, setSelectedTournament] = useState<string>("all");

  const filteredTeams = teams.filter((team) => {
    // Search filter
    const matchesSearch = 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.short_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Country filter
    const matchesCountry = 
      selectedCountry === "all" || team.country_code === selectedCountry;
    
    // Tournament filter
    const matchesTournament = 
      selectedTournament === "all" || 
      teamTournamentMap[team.id]?.includes(selectedTournament);

    return matchesSearch && matchesCountry && matchesTournament;
  });

  const hasActiveFilters = selectedCountry !== "all" || selectedTournament !== "all";

  const clearFilters = () => {
    setSelectedCountry("all");
    setSelectedTournament("all");
    setSearchQuery("");
  };

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Country Filter */}
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={tCommon('filters.filterBy', { field: tCommon('filters.country') })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('filters.allCountries')}</SelectItem>
              {countryCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tournament Filter */}
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={tCommon('filters.filterBy', { field: tCommon('filters.tournament') })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('filters.allTournaments')}</SelectItem>
              {tournaments.map((tournament) => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{tCommon('filters.activeFilters')}:</span>
            {selectedCountry !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {tCommon('filters.country')}: {selectedCountry}
                <button
                  onClick={() => setSelectedCountry("all")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedTournament !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {tCommon('filters.tournament')}: {tournaments.find(t => t.id === selectedTournament)?.name}
                <button
                  onClick={() => setSelectedTournament("all")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {tCommon('actions.clearAll')}
            </Button>
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {tCommon('filters.showingOf', { showing: filteredTeams.length, total: teams.length, item: t('item') })}
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noMatch')}</p>
          <Button variant="link" onClick={clearFilters}>
            {tCommon('actions.clearFilters')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <TeamManagementCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
