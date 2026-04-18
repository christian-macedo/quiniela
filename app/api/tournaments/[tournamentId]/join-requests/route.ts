import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkUserActive } from "@/lib/middleware/user-status-check";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  // Check user is active
  const statusError = await checkUserActive();
  if (statusError) return statusError;

  try {
    const { tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is already a participant
    const { data: participant } = await supabase
      .from("tournament_participants")
      .select("user_id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .single();

    if (participant) {
      return NextResponse.json(
        { error: "You are already a participant in this tournament" },
        { status: 409 }
      );
    }

    // Check if user already has a pending request for this tournament
    const { data: existingRequest } = await supabase
      .from("tournament_join_requests")
      .select("id, status")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending join request for this tournament" },
        { status: 409 }
      );
    }

    // Create the join request
    const { data, error } = await supabase
      .from("tournament_join_requests")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json({ error: "Failed to create join request" }, { status: 500 });
  }
}
