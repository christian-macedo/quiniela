import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournament_id");

    let query = supabase
      .from("matches")
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .order("match_date", { ascending: true });

    if (tournamentId) {
      query = query.eq("tournament_id", tournamentId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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
      status = "scheduled",
      multiplier = 1,
    } = body;

    // Validate required fields
    if (!tournament_id || !home_team_id || !away_team_id || !match_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate teams are different
    if (home_team_id === away_team_id) {
      return NextResponse.json(
        { error: "Home and away teams must be different" },
        { status: 400 }
      );
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
      .insert({
        tournament_id,
        home_team_id,
        away_team_id,
        match_date,
        round,
        status,
        multiplier: multiplierNum,
        home_score: null,
        away_score: null,
      })
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}
