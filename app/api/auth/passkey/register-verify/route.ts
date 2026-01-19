import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyUserRegistrationResponse } from "@/lib/webauthn/server";
import type { PasskeyRegisterVerifyRequest } from "@/types/webauthn";

/**
 * POST /api/auth/passkey/register-verify
 *
 * Verify passkey registration response and store the credential.
 */
export async function POST(request: Request) {
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

    const body: PasskeyRegisterVerifyRequest = await request.json();

    if (!body.response) {
      return NextResponse.json({ error: "Missing registration response" }, { status: 400 });
    }

    // Verify registration response and store credential
    const verification = await verifyUserRegistrationResponse(
      user.id,
      body.response,
      body.credentialName
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "Passkey registered successfully",
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify registration",
      },
      { status: 500 }
    );
  }
}
