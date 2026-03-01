import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET all participants for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const supabase = await createClient();

    const { data: tournamentParticipants, error } = await supabase
      .from("tournament_participants")
      .select(
        `
        user_id,
        joined_at,
        users (
          id,
          screen_name,
          avatar_url,
          created_at,
          updated_at
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    const participants = tournamentParticipants?.map((tp) => tp.users).filter(Boolean) || [];

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching tournament participants:", error);
    return NextResponse.json({ error: "Failed to fetch tournament participants" }, { status: 500 });
  }
}

