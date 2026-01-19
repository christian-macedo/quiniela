import { NextResponse } from "next/server";
import { generateUserAuthenticationOptions } from "@/lib/webauthn/server";
import type { PasskeyAuthenticateOptionsRequest } from "@/types/webauthn";

/**
 * POST /api/auth/passkey/authenticate-options
 *
 * Generate passkey authentication options for a user.
 * No authentication required - this is part of the login flow.
 */
export async function POST(request: Request) {
  try {
    const body: PasskeyAuthenticateOptionsRequest = await request.json();

    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate authentication options
    const { options } = await generateUserAuthenticationOptions(body.email);

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating authentication options:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "User not found") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (error.message === "No passkeys registered for this user") {
        return NextResponse.json(
          { error: "No passkeys registered for this account" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
