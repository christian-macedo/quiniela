import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/users/[userId]/deactivate
 *
 * Admin-only: Soft delete (deactivate) a user account.
 * User can be reactivated later by admin.
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

    // Soft delete via database function
    const { error } = await supabase.rpc("soft_delete_user", {
      target_user_id: userId,
      reason: "admin_action",
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
