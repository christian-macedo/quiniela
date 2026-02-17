import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET all teams for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const supabase = await createClient();

    const { data: tournamentTeams, error } = await supabase
      .from("tournament_teams")
      .select(
        `
        team_id,
        created_at,
        teams (*)
      `
      )
      .eq("tournament_id", tournamentId);

    if (error) throw error;

    const teams = tournamentTeams?.map((tt) => tt.teams).filter(Boolean) || [];

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching tournament teams:", error);
    return NextResponse.json({ error: "Failed to fetch tournament teams" }, { status: 500 });
  }
}

// Add a team to a tournament
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { team_id } = body;

    // Check if team is already in tournament
    const { data: existing } = await supabase
      .from("tournament_teams")
      .select("team_id")
      .eq("tournament_id", tournamentId)
      .eq("team_id", team_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Team is already in this tournament" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tournament_teams")
      .insert({
        tournament_id: tournamentId,
        team_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding team to tournament:", error);
    return NextResponse.json({ error: "Failed to add team to tournament" }, { status: 500 });
  }
}

// Remove a team from a tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // Check if team has matches in this tournament
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .limit(1);

    if (matches && matches.length > 0) {
      return NextResponse.json(
        { error: "Cannot remove team: Team has matches in this tournament" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("tournament_teams")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("team_id", teamId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team from tournament:", error);
    return NextResponse.json({ error: "Failed to remove team from tournament" }, { status: 500 });
  }
}
