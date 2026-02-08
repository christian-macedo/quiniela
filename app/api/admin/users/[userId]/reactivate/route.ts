import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/users/[userId]/reactivate
 *
 * Admin-only: Reactivate a soft-deleted user account.
 * Clears deletion fields and allows user to log in again.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check admin permission
    await requireAdmin();

    const { userId } = await params;
    const supabase = await createClient();

    // Reactivate via database function
    const { error } = await supabase.rpc("reactivate_user", {
      target_user_id: userId,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error reactivating user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reactivate user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
