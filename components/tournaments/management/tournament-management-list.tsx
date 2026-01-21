"use client";

import { Tournament } from "@/types/database";
import { TournamentManagementCard } from "./tournament-management-card";
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

interface TournamentManagementListProps {
  tournaments: Tournament[];
  teamCounts: Record<string, number>;
  matchCounts: Record<string, number>;
}

export function TournamentManagementList({ 
  tournaments, 
  teamCounts,
  matchCounts 
}: TournamentManagementListProps) {
  const t = useTranslations('tournaments.management');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('tournaments.status');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || tournament.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = selectedStatus !== "all";

  const clearFilters = () => {
    setSelectedStatus("all");
    setSearchQuery("");
  };

  if (tournaments.length === 0) {
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
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('filters.allStatuses')}</SelectItem>
              <SelectItem value="upcoming">{tStatus('upcoming')}</SelectItem>
              <SelectItem value="active">{tStatus('active')}</SelectItem>
              <SelectItem value="completed">{tStatus('completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{tCommon('filters.activeFilters')}:</span>
            {selectedStatus !== "all" && (
              <Badge variant="secondary" className="gap-1 capitalize">
                {tCommon('labels.status')}: {tStatus(selectedStatus)}
                <button
                  onClick={() => setSelectedStatus("all")}
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

        <div className="text-sm text-muted-foreground">
          {tCommon('filters.showingOf', { showing: filteredTournaments.length, total: tournaments.length, item: t('item') })}
        </div>
      </div>

      {filteredTournaments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noMatch')}</p>
          <Button variant="link" onClick={clearFilters}>
            {tCommon('actions.clearFilters')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentManagementCard 
              key={tournament.id} 
              tournament={tournament}
              teamCount={teamCounts[tournament.id] || 0}
              matchCount={matchCounts[tournament.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
