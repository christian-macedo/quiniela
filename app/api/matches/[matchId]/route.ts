import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

