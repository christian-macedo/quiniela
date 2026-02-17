import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { updateUserAdminStatus } from "@/lib/utils/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  try {
    const { userId } = await params;
    const body = await request.json();
    const { is_admin } = body;

    if (typeof is_admin !== "boolean") {
      return NextResponse.json({ error: "is_admin must be a boolean" }, { status: 400 });
    }

    await updateUserAdminStatus(userId, is_admin);

    return NextResponse.json({ success: true, is_admin });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return NextResponse.json({ error: "Failed to update user permissions" }, { status: 500 });
  }
}
