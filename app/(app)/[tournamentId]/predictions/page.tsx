"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PredictionForm } from "@/components/predictions/prediction-form";
import { PredictionResultCard } from "@/components/predictions/prediction-result-card";
import { MatchWithTeams, Prediction } from "@/types/database";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PredictionsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;
  const [scheduledMatches, setScheduledMatches] = useState<MatchWithTeams[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchWithTeams[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Load scheduled matches
    const { data: scheduledMatchesData } = await supabase
      .from("matches")
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .order("match_date", { ascending: true });

    // Load completed matches
    const { data: completedMatchesData } = await supabase
      .from("matches")
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .eq("tournament_id", tournamentId)
      .eq("status", "completed")
      .order("match_date", { ascending: false });

    const allMatchIds = [
      ...(scheduledMatchesData?.map(m => m.id) || []),
      ...(completedMatchesData?.map(m => m.id) || [])
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
    predictionsData?.forEach(p => {
      predictionsMap[p.match_id] = p;
    });
    setPredictions(predictionsMap);
    setLoading(false);
  }

  async function handleSubmitPrediction(matchId: string, homeScore: number, awayScore: number) {
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
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Filter completed matches to only show those with predictions
  const completedWithPredictions = completedMatches.filter(match => predictions[match.id]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Predictions</h1>
          <p className="text-muted-foreground">
            Submit predictions for upcoming matches and view your results
          </p>
        </div>
        <Link href={`/${tournamentId}`}>
          <Button variant="outline">Back to Tournament</Button>
        </Link>
      </div>

      <div className="space-y-12">
        {/* Completed Matches Section */}
        {completedWithPredictions.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Completed Matches</h2>
              <p className="text-sm text-muted-foreground">
                View your predictions and points earned
              </p>
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
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Upcoming Matches</h2>
            <p className="text-sm text-muted-foreground">
              Submit your score predictions before matches start
            </p>
          </div>
          {scheduledMatches.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No upcoming matches available for predictions.</p>
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
      </div>
    </div>
  );
}
