import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculatePoints } from "@/lib/utils/scoring";
import { getCurrentUTC } from "@/lib/utils/date";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { matchId } = await params;
    const body = await request.json();
    const { home_score, away_score, status } = body;

    // Get match details to retrieve multiplier and current status
    const { data: matchData, error: matchFetchError } = await supabase
      .from("matches")
      .select("multiplier, tournament_id, status")
      .eq("id", matchId)
      .single();

    if (matchFetchError) throw matchFetchError;

    const multiplier = matchData?.multiplier || 1.0;
    const currentStatus = matchData?.status;
    const newStatus = status || "completed";

    // Update match score
    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score,
        away_score,
        status: newStatus,
        updated_at: getCurrentUTC(),
      })
      .eq("id", matchId);

    if (matchError) throw matchError;

    // Get all predictions for this match
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", matchId);

    if (predictionsError) throw predictionsError;

    // Check if we're changing from completed to non-completed status
    const isUnscoring = currentStatus === "completed" && newStatus !== "completed";

    // Calculate and update points for each prediction
    for (const prediction of predictions || []) {
      let points = 0;

      if (isUnscoring) {
        // Reset to 0 if changing from completed to another status
        points = 0;
      } else if (newStatus === "completed") {
        // Calculate points if match is being completed
        points = calculatePoints(
          prediction.predicted_home_score,
          prediction.predicted_away_score,
          home_score,
          away_score,
          multiplier
        );
      }

      await supabase.from("predictions").update({ points_earned: points }).eq("id", prediction.id);
    }

    // No need to update tournament rankings - they are calculated dynamically via view

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating match score:", error);
    return NextResponse.json({ error: "Failed to update match score" }, { status: 500 });
  }
}
