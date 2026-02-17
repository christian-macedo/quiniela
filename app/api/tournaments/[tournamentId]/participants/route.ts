import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";

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

// Add a participant to a tournament (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    // Check admin permission
    const adminError = await checkAdminPermission();
    if (adminError) return adminError;

    const { tournamentId } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user exists
    const { data: userExists } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already a participant
    const { data: existing } = await supabase
      .from("tournament_participants")
      .select("user_id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "User is already a participant in this tournament" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding participant to tournament:", error);
    return NextResponse.json({ error: "Failed to add participant to tournament" }, { status: 500 });
  }
}

// Remove a participant from a tournament (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    // Check admin permission
    const adminError = await checkAdminPermission();
    if (adminError) return adminError;

    const { tournamentId } = await params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user has predictions in this tournament
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId);

    const matchIds = matches?.map((m) => m.id) || [];

    if (matchIds.length > 0) {
      const { data: predictions } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", userId)
        .in("match_id", matchIds)
        .limit(1);

      if (predictions && predictions.length > 0) {
        return NextResponse.json(
          { error: "Cannot remove participant: User has predictions in this tournament" },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("tournament_participants")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing participant from tournament:", error);
    return NextResponse.json(
      { error: "Failed to remove participant from tournament" },
      { status: 500 }
    );
  }
}
