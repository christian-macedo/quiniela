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
    // Return the same generic message for both "not found" cases to prevent email enumeration
    if (error instanceof Error) {
      if (
        error.message === "User not found" ||
        error.message === "No passkeys registered for this user"
      ) {
        return NextResponse.json(
          { error: "Could not find credentials for this account" },
          { status: 404 }
        );
      }
    }

    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
