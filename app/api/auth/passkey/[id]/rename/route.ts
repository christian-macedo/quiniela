import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid passkey name" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Passkey name too long (max 100 characters)" },
        { status: 400 }
      );
    }

    // Update credential name (RLS ensures user can only update their own)
    const { data, error } = await supabase
      .from("webauthn_credentials")
      .update({ credential_name: name.trim() })
      .eq("id", id)
      .eq("user_id", user.id) // Extra safety check
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Passkey not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      passkey: data
    });
  } catch (error) {
    console.error("Error renaming passkey:", error);
    return NextResponse.json(
      { error: "Failed to rename passkey" },
      { status: 500 }
    );
  }
}
