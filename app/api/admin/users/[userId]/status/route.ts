import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { updateUserStatus } from "@/lib/utils/admin";

/**
 * PATCH /api/admin/users/[userId]/status
 * Admin-only user status management
 *
 * Request body:
 * {
 *   "status": "active" | "deactivated"
 * }
 *
 * Effects of deactivation:
 * - User cannot log in
 * - User cannot submit predictions
 * - User is removed from rankings
 * - All historical data is preserved
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  try {
    const { userId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["active", "deactivated"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'active' or 'deactivated'." },
        { status: 400 }
      );
    }

    await updateUserStatus(userId, status);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
  }
}
