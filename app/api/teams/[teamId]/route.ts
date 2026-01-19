import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUTC } from "@/lib/utils/date";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (error) throw error;

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, short_name, country_code, logo_url } = body;

    const { data, error } = await supabase
      .from("teams")
      .update({
        name,
        short_name,
        country_code,
        logo_url,
        updated_at: getCurrentUTC(),
      })
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if team has participated in any matches
    const { data: homeMatches, error: homeMatchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("home_team_id", teamId)
      .limit(1);

    if (homeMatchesError) throw homeMatchesError;

    const { data: awayMatches, error: awayMatchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("away_team_id", teamId)
      .limit(1);

    if (awayMatchesError) throw awayMatchesError;

    if ((homeMatches && homeMatches.length > 0) || (awayMatches && awayMatches.length > 0)) {
      return NextResponse.json(
        { error: "Cannot delete team: This team has participated in matches. Remove the team from all matches first." },
        { status: 400 }
      );
    }

    // Check if team is registered in any tournament
    const { data: tournamentTeams, error: tournamentTeamsError } = await supabase
      .from("tournament_teams")
      .select("tournament_id")
      .eq("team_id", teamId)
      .limit(1);

    if (tournamentTeamsError) throw tournamentTeamsError;

    if (tournamentTeams && tournamentTeams.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete team: This team is registered in tournaments. Remove the team from all tournaments first." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
