import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateUserRegistrationOptions } from "@/lib/webauthn/server";

/**
 * POST /api/auth/passkey/register-options
 *
 * Generate passkey registration options for the authenticated user.
 * User must be logged in to register a passkey.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to register a passkey" },
        { status: 401 }
      );
    }

    // Get user email from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate registration options
    const options = await generateUserRegistrationOptions(user.id, userData.email);

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate registration options",
      },
      { status: 500 }
    );
  }
}
