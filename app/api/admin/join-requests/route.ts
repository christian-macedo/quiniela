import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { maskEmail } from "@/lib/utils/privacy";

export async function GET(request: NextRequest) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const tournamentIdFilter = searchParams.get("tournamentId");
    const userIdFilter = searchParams.get("userId");

    let query = supabase
      .from("tournament_join_requests")
      .select(
        `
        *,
        user:users(id, email, screen_name, avatar_url),
        tournament:tournaments(id, name)
      `
      )
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (tournamentIdFilter) {
      query = query.eq("tournament_id", tournamentIdFilter);
    }

    if (userIdFilter) {
      query = query.eq("user_id", userIdFilter);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    // Count by status
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    (requests || []).forEach((r) => {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts]++;
      }
    });

    // Mask email before returning — admin lists must not expose raw PII
    const sanitized = (requests || []).map((r) => ({
      ...r,
      user: r.user ? { ...r.user, email: maskEmail(r.user.email) } : r.user,
    }));

    return NextResponse.json({ requests: sanitized, counts });
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json({ error: "Failed to fetch join requests" }, { status: 500 });
  }
}
