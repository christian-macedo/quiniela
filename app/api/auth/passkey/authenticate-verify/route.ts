import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUserAuthenticationResponse } from "@/lib/webauthn/server";
import type { PasskeyAuthenticateVerifyRequest } from "@/types/webauthn";

/**
 * POST /api/auth/passkey/authenticate-verify
 *
 * Verify passkey authentication response and create a Supabase session.
 */
export async function POST(request: Request) {
  try {
    const body: PasskeyAuthenticateVerifyRequest = await request.json();

    if (!body.response || !body.email) {
      return NextResponse.json(
        { error: "Missing authentication response or email" },
        { status: 400 }
      );
    }

    // Verify authentication response using secure database functions
    const { verified, userId } = await verifyUserAuthenticationResponse(
      body.email,
      body.response
    );

    if (!verified) {
      return NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 400 }
      );
    }

    // Use admin client to generate a magic link and create session
    const adminClient = createAdminClient();

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: body.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_RP_ORIGIN}/tournaments`,
        },
      });

    if (linkError || !linkData) {
      console.error("Failed to generate link:", linkError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Use the hashed token to create session directly
    const supabase = await createClient();

    const { data: sessionData, error: sessionError } =
      await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

    if (sessionError || !sessionData.session) {
      console.error("Failed to create session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Update last_login timestamp
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({
      verified: true,
      userId,
      session: sessionData.session,
    });
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify authentication",
      },
      { status: 500 }
    );
  }
}
