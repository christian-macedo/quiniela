import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUTC } from "@/lib/utils/date";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const supabase = await createClient();

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (error) throw error;

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Error fetching tournament:", error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

export async function PUT(
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
    const { name, sport, start_date, end_date, status, scoring_rules } = body;

    const { data, error } = await supabase
      .from("tournaments")
      .update({
        name,
        sport,
        start_date,
        end_date,
        status,
        scoring_rules,
        updated_at: getCurrentUTC(),
      })
      .eq("id", tournamentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating tournament:", error);
    return NextResponse.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

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

    // Check if tournament has any matches
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .limit(1);

    if (matchesError) throw matchesError;

    if (matches && matches.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete tournament: This tournament has matches. Remove all matches first.",
        },
        { status: 400 }
      );
    }

    // Check if tournament has any predictions (through rankings)
    const { data: rankings, error: rankingsError } = await supabase
      .from("tournament_rankings")
      .select("user_id")
      .eq("tournament_id", tournamentId)
      .limit(1);

    if (rankingsError) throw rankingsError;

    if (rankings && rankings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete tournament: Users have made predictions for this tournament." },
        { status: 400 }
      );
    }

    // Delete tournament teams first
    const { error: teamDeleteError } = await supabase
      .from("tournament_teams")
      .delete()
      .eq("tournament_id", tournamentId);

    if (teamDeleteError) throw teamDeleteError;

    // Delete tournament
    const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tournament:", error);
    return NextResponse.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}
