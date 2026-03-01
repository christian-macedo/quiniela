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

