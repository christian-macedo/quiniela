import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUTC } from "@/lib/utils/date";
import { checkUserActive } from "@/lib/middleware/user-status-check";

export async function POST(request: NextRequest) {
  try {
    // Check user is active
    const statusError = await checkUserActive();
    if (statusError) return statusError;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { match_id, predicted_home_score, predicted_away_score } = body;

    if (!match_id || typeof match_id !== "string") {
      return NextResponse.json({ error: "match_id is required" }, { status: 400 });
    }

    if (
      typeof predicted_home_score !== "number" ||
      !Number.isInteger(predicted_home_score) ||
      predicted_home_score < 0 ||
      predicted_home_score > 99 ||
      typeof predicted_away_score !== "number" ||
      !Number.isInteger(predicted_away_score) ||
      predicted_away_score < 0 ||
      predicted_away_score > 99
    ) {
      return NextResponse.json({ error: "Scores must be integers between 0 and 99" }, { status: 400 });
    }

    // Get the match to find the tournament_id and check it is open for predictions
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("tournament_id, status")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status === "completed" || match.status === "cancelled") {
      return NextResponse.json(
        { error: "Predictions are closed for this match" },
        { status: 422 }
      );
    }

    // Check if user is a participant in this tournament
    const { data: participant } = await supabase
      .from("tournament_participants")
      .select("user_id")
      .eq("tournament_id", match.tournament_id)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "You must be a tournament participant to submit predictions" },
        { status: 403 }
      );
    }

    // Upsert prediction (atomic insert-or-update using UNIQUE(user_id, match_id))
    const { data, error } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: user.id,
          match_id,
          predicted_home_score,
          predicted_away_score,
          updated_at: getCurrentUTC(),
        },
        { onConflict: "user_id,match_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating/updating prediction:", error);
    return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
  }
}
