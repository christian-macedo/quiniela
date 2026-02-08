import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/profile/deactivate
 *
 * Allows users to deactivate their own account (soft delete).
 * User is immediately signed out after deactivation.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete via database function
    const { error } = await supabase.rpc("soft_delete_user", {
      target_user_id: user.id,
      reason: "self_requested",
    });

    if (error) throw error;

    // Sign out user immediately
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating account:", error);
    return NextResponse.json(
      { error: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
