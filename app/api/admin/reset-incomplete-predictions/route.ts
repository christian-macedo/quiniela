import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Reset all prediction scores to 0 for matches that are not completed
 * This is an admin endpoint to ensure data consistency
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Get all matches that are not completed
    const { data: nonCompletedMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .neq("status", "completed");

    if (matchesError) throw matchesError;

    if (!nonCompletedMatches || nonCompletedMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No non-completed matches found",
        updatedCount: 0,
      });
    }

    const matchIds = nonCompletedMatches.map((m) => m.id);

    // Reset predictions for these matches
    const { error: updateError } = await supabase
      .from("predictions")
      .update({ points_earned: 0 })
      .in("match_id", matchIds);

    if (updateError) throw updateError;

    // No need to update tournament rankings - they are calculated dynamically via view

    return NextResponse.json({
      success: true,
      message: "Successfully reset predictions for non-completed matches",
      matchesAffected: matchIds.length,
    });
  } catch (error) {
    console.error("Error resetting predictions:", error);
    return NextResponse.json({ error: "Failed to reset predictions" }, { status: 500 });
  }
}
