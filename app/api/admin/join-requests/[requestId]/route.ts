import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  try {
    const { requestId } = await params;
    const supabase = await createClient();
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Fetch the join request to verify it exists and is pending
    const { data: joinRequest, error: fetchError } = await supabase
      .from("tournament_join_requests")
      .select("id, tournament_id, user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    if (joinRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be approved or rejected" },
        { status: 409 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const now = new Date().toISOString();

    // Update the join request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from("tournament_join_requests")
      .update({
        status: newStatus,
        reviewed_at: now,
        reviewed_by: adminUser.id,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) throw updateError;

    // If approved, add user to tournament_participants
    if (action === "approve") {
      const { error: participantError } = await supabase.from("tournament_participants").insert({
        tournament_id: joinRequest.tournament_id,
        user_id: joinRequest.user_id,
      });

      if (participantError) throw participantError;
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error processing join request:", error);
    return NextResponse.json({ error: "Failed to process join request" }, { status: 500 });
  }
}
