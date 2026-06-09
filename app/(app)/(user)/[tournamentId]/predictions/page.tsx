"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { PredictionResultCard } from "@/components/predictions/prediction-result-card";
import { UpcomingMatchesFilters } from "@/components/predictions/upcoming-matches-filters";
import { CollapsibleSection } from "@/components/predictions/collapsible-section";
import { MatchWithTeams, Prediction } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/layout/back-button";
import { TournamentBreadcrumbs } from "@/components/layout/tournament-breadcrumbs";
import Link from "next/link";

export default function PredictionsPage() {
  const t = useTranslations("predictions");
  const tCommon = useTranslations("common");
  const toast = useFeatureToast("predictions");
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const [scheduledMatches, setScheduledMatches] = useState<MatchWithTeams[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchWithTeams[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(true);
  const [tournamentName, setTournamentName] = useState("");
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Layout guarantees authentication; user will always be present
    if (!user) return;

    // Check if user is a participant
    const { data: participant } = await supabase
      .from("tournament_participants")
      .select("user_id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .single();

    setIsParticipant(!!participant);

    // Load tournament name for the breadcrumb trail
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("name")
      .eq("id", tournamentId)
      .single();

    setTournamentName(tournament?.name ?? "");

    // Load scheduled matches
    const { data: scheduledMatchesData } = await supabase
      .from("matches")
      .select(
        `
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `
      )
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .order("match_date", { ascending: true });

    // Load completed matches
    const { data: completedMatchesData } = await supabase
      .from("matches")
      .select(
        `
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `
      )
      .eq("tournament_id", tournamentId)
      .eq("status", "completed")
      .order("match_date", { ascending: false });

    const allMatchIds = [
      ...(scheduledMatchesData?.map((m) => m.id) || []),
      ...(completedMatchesData?.map((m) => m.id) || []),
    ];

    // Load user's predictions for all matches
    const { data: predictionsData } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user.id)
      .in("match_id", allMatchIds);

    setScheduledMatches(scheduledMatchesData || []);
    setCompletedMatches(completedMatchesData || []);

    const predictionsMap: Record<string, Prediction> = {};
    predictionsData?.forEach((p) => {
      predictionsMap[p.match_id] = p;
    });
    setPredictions(predictionsMap);
    setLoading(false);
  }, [supabase, tournamentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmitPrediction(matchId: string, homeScore: number, awayScore: number) {
    if (!isParticipant) {
      toast.error("error.mustBeParticipant");
      return;
    }

    const isUpdate = !!predictions[matchId];

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      }),
    });

    if (response.ok) {
      toast.success(isUpdate ? "success.updated" : "success.submitted");
      loadData();
    } else if (response.status === 403) {
      toast.error("error.notAuthorized");
      setIsParticipant(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{tCommon("status.loading")}</div>
      </div>
    );
  }

  // Filter completed matches to only show those with predictions
  const completedWithPredictions = completedMatches.filter((match) => predictions[match.id]);

  // Upcoming progress summary
  const totalUpcoming = scheduledMatches.length;
  const predictedCount = scheduledMatches.filter((match) => predictions[match.id]).length;
  const missingCount = totalUpcoming - predictedCount;

  // Completed summary
  const completedCount = completedWithPredictions.length;
  const totalPoints = completedWithPredictions.reduce(
    (sum, match) => sum + (predictions[match.id]?.points_earned ?? 0),
    0
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <TournamentBreadcrumbs
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        items={[{ label: t("title") }]}
      />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <BackButton fallbackHref={`/${tournamentId}`} />
      </div>

      {!isParticipant && (
        <div className="mb-8 p-6 bg-muted/50 border rounded-lg text-center">
          <h3 className="text-lg font-semibold mb-2">{t("notParticipant.title")}</h3>
          <p className="text-muted-foreground">{t("notParticipant.message")}</p>
          <p className="text-muted-foreground mt-2">{t("notParticipant.contact")}</p>
          <Link href={`/${tournamentId}`} className="inline-block mt-4">
            <Button variant="outline">{t("backToTournament")}</Button>
          </Link>
        </div>
      )}

      {isParticipant && (
        <div className="space-y-12">
          {/* Upcoming Matches Section (primary — what the user acts on) */}
          <CollapsibleSection
            title={t("upcomingMatches")}
            subtitle={t("upcomingMatchesSubtitle")}
            defaultOpen={true}
            summary={
              <span className="flex items-center gap-2">
                <span>
                  {t("summary.predictedOf", { predicted: predictedCount, total: totalUpcoming })}
                </span>
                {missingCount > 0 && (
                  <Badge variant="outline" className="text-primary border-primary">
                    {t("summary.missing", { count: missingCount })}
                  </Badge>
                )}
              </span>
            }
          >
            {scheduledMatches.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/50">
                <p className="text-muted-foreground">{t("noUpcomingMatches")}</p>
              </div>
            ) : (
              <UpcomingMatchesFilters
                matches={scheduledMatches}
                predictions={predictions}
                onSubmitPrediction={handleSubmitPrediction}
              />
            )}
          </CollapsibleSection>

          {/* Completed Matches Section (secondary — grows over the tournament) */}
          {completedWithPredictions.length > 0 && (
            <CollapsibleSection
              title={t("completedMatches")}
              subtitle={t("completedMatchesSubtitle")}
              defaultOpen={false}
              summary={t("summary.matchesPoints", {
                matches: completedCount,
                points: totalPoints,
              })}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedWithPredictions.map((match) => (
                  <PredictionResultCard
                    key={match.id}
                    match={match}
                    prediction={predictions[match.id]}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
