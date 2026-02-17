import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUTC } from "@/lib/utils/date";

/**
 * POST /api/account/deactivate
 * User self-service account deactivation
 *
 * Effects:
 * - Sets user status to 'deactivated'
 * - Signs out the user immediately
 * - Prevents login and prediction submission
 * - Removes user from rankings
 * - Preserves all historical data
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update status to deactivated
    const { error } = await supabase
      .from("users")
      .update({
        status: "deactivated",
        updated_at: getCurrentUTC(),
      })
      .eq("id", user.id);

    if (error) throw error;

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating account:", error);
    return NextResponse.json({ error: "Failed to deactivate account" }, { status: 500 });
  }
}
