import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkUserActive } from "@/lib/middleware/user-status-check";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; requestId: string }> }
) {
  // Check user is active
  const statusError = await checkUserActive();
  if (statusError) return statusError;

  try {
    const { requestId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the request to verify ownership and status
    const { data: joinRequest, error: fetchError } = await supabase
      .from("tournament_join_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    // Verify this request belongs to the current user
    if (joinRequest.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow cancelling pending requests
    if (joinRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be cancelled" },
        { status: 409 }
      );
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from("tournament_join_requests")
      .delete()
      .eq("id", requestId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling join request:", error);
    return NextResponse.json({ error: "Failed to cancel join request" }, { status: 500 });
  }
}
