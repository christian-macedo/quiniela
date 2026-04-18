import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkUserActive } from "@/lib/middleware/user-status-check";
import { JoinRequestStatusCheck } from "@/types/database";

export async function GET(
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

    // Find the most recent join request for this user and tournament
    const { data: request } = await supabase
      .from("tournament_join_requests")
      .select("id, status, created_at")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!request) {
      const result: JoinRequestStatusCheck = { hasRequest: false };
      return NextResponse.json(result);
    }

    const result: JoinRequestStatusCheck = {
      hasRequest: true,
      status: request.status,
      requestId: request.id,
      createdAt: request.created_at,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking join request status:", error);
    return NextResponse.json({ error: "Failed to check join request status" }, { status: 500 });
  }
}
