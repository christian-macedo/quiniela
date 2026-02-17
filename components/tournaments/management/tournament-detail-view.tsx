"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tournament, Team, MatchWithTeams, AdminUserView } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/teams/team-badge";
import { MatchCard } from "@/components/matches/match-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDate } from "@/lib/utils/date";
import { getPublicUserDisplay, getPublicUserInitials, maskEmail } from "@/lib/utils/privacy";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import {
  ArrowLeft,
  Pencil,
  Users,
  Calendar,
  Trophy,
  UserCircle,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Participant {
  user: AdminUserView | null;
  total_points: number;
  rank: number | null;
}

interface TournamentDetailViewProps {
  tournament: Tournament;
  teams: Team[];
  allTeams: Team[];
  matches: MatchWithTeams[];
  participants: Participant[];
  allUsers: AdminUserView[];
}

const statusColors = {
  upcoming: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
};

export function TournamentDetailView({
  tournament,
  teams,
  allTeams,
  matches,
  participants,
  allUsers,
}: TournamentDetailViewProps) {
  const router = useRouter();
  const t = useTranslations("tournaments");
  const tCommon = useTranslations("common");
  const toastTeams = useFeatureToast("teams");
  const toastTournaments = useFeatureToast("tournaments");

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const availableTeams = allTeams.filter((t) => !teams.some((existing) => existing.id === t.id));

  const participantUserIds = participants.map((p) => p.user?.id).filter(Boolean);
  const availableUsers = allUsers.filter((u) => !participantUserIds.includes(u.id));

  const handleAddTeam = async () => {
    if (!selectedTeamId) return;

    setIsAddingTeam(true);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: selectedTeamId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add team");
      }

      toastTeams.success("success.addedToTournament");
      setSelectedTeamId("");
      router.refresh();
    } catch (err) {
      console.error(err);
      toastTeams.error("error.failedToAddToTournament");
    } finally {
      setIsAddingTeam(false);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    setRemovingTeamId(teamId);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/teams?teamId=${teamId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove team");
      }

      toastTeams.success("success.removedFromTournament");
      router.refresh();
    } catch (err) {
      console.error(err);
      toastTeams.error("error.failedToRemoveFromTournament");
    } finally {
      setRemovingTeamId(null);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserId) return;

    setIsAddingParticipant(true);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add participant");
      }

      toastTournaments.success("success.participantAdded");
      setSelectedUserId("");
      router.refresh();
    } catch (err) {
      console.error(err);
      toastTournaments.error("error.failedToAddParticipant");
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    setRemovingUserId(userId);

    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/participants?userId=${userId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove participant");
      }

      toastTournaments.success("success.participantRemoved");
      router.refresh();
    } catch (err) {
      console.error(err);
      toastTournaments.error("error.failedToRemoveParticipant");
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Link href="/tournaments/manage">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${statusColors[tournament.status]}`} />
              <Badge variant="outline" className="capitalize">
                {t(`status.${tournament.status}`)}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {tournament.sport}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground">
              {formatLocalDate(tournament.start_date)} - {formatLocalDate(tournament.end_date)}
            </p>
          </div>
        </div>
        <Link href={`/tournaments/manage/${tournament.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {t("detail.editTournament")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-sm text-muted-foreground">{t("detail.teams")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{matches.length}</p>
                <p className="text-sm text-muted-foreground">{t("detail.matches")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{participants.length}</p>
                <p className="text-sm text-muted-foreground">{t("detail.participants")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {t("detail.participatingTeams")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Team */}
          <div className="flex gap-2">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("detail.selectTeamToAdd")} />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t("detail.noTeamsAvailable")}
                  </SelectItem>
                ) : (
                  availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.short_name})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAddTeam} disabled={!selectedTeamId || isAddingTeam}>
              {isAddingTeam ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Team List */}
          {teams.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t("detail.noTeamsYet")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Link href={`/teams/${team.id}`}>
                    <TeamBadge team={team} size="sm" showName={true} />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTeam(team.id)}
                    disabled={removingTeamId === team.id}
                    title="Remove from tournament"
                  >
                    {removingTeamId === team.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            {t("detail.participatingUsers")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Participant */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("detail.selectUserToAdd")} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t("detail.noUsersAvailable")}
                  </SelectItem>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getPublicUserDisplay(user)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddParticipant}
              disabled={!selectedUserId || isAddingParticipant}
            >
              {isAddingParticipant ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Participant List */}
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {t("detail.noParticipantsYet")}
            </p>
          ) : (
            <div className="space-y-2">
              {participants.map(
                (participant) =>
                  participant.user && (
                    <div
                      key={participant.user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {participant.rank && (
                          <span className="text-lg font-bold text-muted-foreground w-8">
                            #{participant.rank}
                          </span>
                        )}
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.user.avatar_url || undefined} />
                          <AvatarFallback>{getPublicUserInitials(participant.user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getPublicUserDisplay(participant.user)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {maskEmail(participant.user.email)}
                            <Badge variant="outline" className="text-xs ml-1">
                              Admin
                            </Badge>
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {participant.total_points} {tCommon("labels.pts")}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveParticipant(participant.user!.id)}
                        disabled={removingUserId === participant.user.id}
                        title={t("detail.removeFromTournament")}
                      >
                        {removingUserId === participant.user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matches */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("detail.matches")}
            </CardTitle>
            <Link href={`/tournaments/manage/${tournament.id}/matches`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                {t("detail.manageMatches")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t("detail.noMatchesYet")}</p>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
