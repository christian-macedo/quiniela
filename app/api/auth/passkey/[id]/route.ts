import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Delete credential (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from("webauthn_credentials")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Extra safety check

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Passkey deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 }
    );
  }
}
