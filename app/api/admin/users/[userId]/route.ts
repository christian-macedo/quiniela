import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/admin";
import { NextResponse } from "next/server";

/**
 * DELETE /api/admin/users/[userId]
 *
 * Admin-only: Permanently delete a user account (hard delete).
 * This cascades to all related data (predictions, tournament_participants, etc.)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check admin permission
    await requireAdmin();

    const { userId } = await params;
    const supabase = await createClient();

    // Hard delete from public.users
    // ON DELETE CASCADE handles all related data automatically
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
