"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { PredictionForm } from "@/components/predictions/prediction-form";
import { PredictionResultCard } from "@/components/predictions/prediction-result-card";
import { MatchWithTeams, Prediction } from "@/types/database";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PredictionsPage() {
  const t = useTranslations("predictions");
  const tCommon = useTranslations("common");
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const [scheduledMatches, setScheduledMatches] = useState<MatchWithTeams[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchWithTeams[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(true);
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
      alert(t("mustBeParticipant"));
      return;
    }

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
      loadData();
    } else if (response.status === 403) {
      const data = await response.json();
      alert(data.error || t("notAuthorized"));
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href={`/${tournamentId}`}>
          <Button variant="outline">{t("backToTournament")}</Button>
        </Link>
      </div>

      {!isParticipant && (
        <div className="mb-8 p-6 bg-muted/50 border rounded-lg text-center">
          <h3 className="text-lg font-semibold mb-2">{t("notParticipant")}</h3>
          <p className="text-muted-foreground">{t("notParticipantMessage")}</p>
        </div>
      )}

      <div className="space-y-12">
        {/* Completed Matches Section */}
        {completedWithPredictions.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{t("completedMatches")}</h2>
              <p className="text-sm text-muted-foreground">{t("completedMatchesSubtitle")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedWithPredictions.map((match) => (
                <PredictionResultCard
                  key={match.id}
                  match={match}
                  prediction={predictions[match.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Matches Section */}
        {isParticipant && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{t("upcomingMatches")}</h2>
              <p className="text-sm text-muted-foreground">{t("upcomingMatchesSubtitle")}</p>
            </div>
            {scheduledMatches.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/50">
                <p className="text-muted-foreground">{t("noUpcomingMatches")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduledMatches.map((match) => (
                  <PredictionForm
                    key={match.id}
                    match={match}
                    existingPrediction={predictions[match.id]}
                    onSubmit={(home, away) => handleSubmitPrediction(match.id, home, away)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
