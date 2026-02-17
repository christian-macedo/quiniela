import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUTC } from "@/lib/utils/date";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { matchId } = await params;

    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        tournament:tournaments(*)
      `
      )
      .eq("id", matchId)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching match:", error);
    return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { matchId } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tournament_id,
      home_team_id,
      away_team_id,
      match_date,
      round,
      status,
      multiplier = 1,
    } = body;

    // Validate required fields
    if (!tournament_id || !home_team_id || !away_team_id || !match_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate teams are different
    if (home_team_id === away_team_id) {
      return NextResponse.json({ error: "Home and away teams must be different" }, { status: 400 });
    }

    // Validate multiplier
    const multiplierNum = parseInt(multiplier);
    if (isNaN(multiplierNum) || multiplierNum < 1 || multiplierNum > 3) {
      return NextResponse.json(
        { error: "Multiplier must be an integer between 1 and 3" },
        { status: 400 }
      );
    }

    // Verify both teams are in the tournament
    const { data: tournamentTeams } = await supabase
      .from("tournament_teams")
      .select("team_id")
      .eq("tournament_id", tournament_id)
      .in("team_id", [home_team_id, away_team_id]);

    if (!tournamentTeams || tournamentTeams.length !== 2) {
      return NextResponse.json(
        { error: "Both teams must be registered in the tournament" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("matches")
      .update({
        tournament_id,
        home_team_id,
        away_team_id,
        match_date,
        round,
        status,
        multiplier: multiplierNum,
        updated_at: getCurrentUTC(),
      })
      .eq("id", matchId)
      .select(
        `
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating match:", error);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { matchId } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if match has any predictions
    const { data: predictions } = await supabase
      .from("predictions")
      .select("id")
      .eq("match_id", matchId)
      .limit(1);

    if (predictions && predictions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete match: Users have made predictions for this match. Please cancel the match instead of deleting it.",
        },
        { status: 400 }
      );
    }

    // Delete the match
    const { error } = await supabase.from("matches").delete().eq("id", matchId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting match:", error);
    return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
  }
}
