/**
 * WebAuthn Client Utilities
 *
 * Client-side functions for WebAuthn registration and authentication.
 * These functions interact with the browser's WebAuthn API via SimpleWebAuthn.
 */

import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import type { PasskeyCredentialSummary } from "@/types/webauthn";

/**
 * Error types for better error handling
 */
export class PasskeyError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "PasskeyError";
  }
}

/**
 * Register a new passkey for the current user
 */
export async function registerPasskey(
  credentialName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Get registration options from server
    const optionsResponse = await fetch("/api/auth/passkey/register-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      throw new PasskeyError(
        error.error || "Failed to get registration options",
        "OPTIONS_ERROR",
        error
      );
    }

    const options: PublicKeyCredentialCreationOptionsJSON = await optionsResponse.json();

    // Step 2: Start registration with browser
    let registrationResponse: RegistrationResponseJSON;
    try {
      registrationResponse = await startRegistration({ optionsJSON: options });
    } catch (error) {
      // Handle user cancellation or browser errors
      if (error instanceof Error && error.name === "NotAllowedError") {
        throw new PasskeyError("Registration was cancelled", "USER_CANCELLED");
      }
      throw new PasskeyError(
        "Failed to create passkey. Your device may not support passkeys.",
        "BROWSER_ERROR",
        error
      );
    }

    // Step 3: Verify registration with server
    const verifyResponse = await fetch("/api/auth/passkey/register-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: registrationResponse,
        credentialName,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new PasskeyError(
        error.error || "Failed to verify registration",
        "VERIFICATION_ERROR",
        error
      );
    }

    return { success: true };
  } catch (error) {
    if (error instanceof PasskeyError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred during passkey registration",
    };
  }
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Get authentication options from server
    const optionsResponse = await fetch("/api/auth/passkey/authenticate-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      throw new PasskeyError(
        error.error || "Failed to get authentication options",
        "OPTIONS_ERROR",
        error
      );
    }

    const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();

    // Step 2: Start authentication with browser
    let authenticationResponse: AuthenticationResponseJSON;
    try {
      authenticationResponse = await startAuthentication({ optionsJSON: options });
    } catch (error) {
      // Handle user cancellation or browser errors
      if (error instanceof Error && error.name === "NotAllowedError") {
        throw new PasskeyError("Authentication was cancelled", "USER_CANCELLED");
      }
      throw new PasskeyError(
        "Failed to authenticate with passkey",
        "BROWSER_ERROR",
        error
      );
    }

    // Step 3: Verify authentication with server (creates session directly)
    const verifyResponse = await fetch("/api/auth/passkey/authenticate-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: authenticationResponse,
        email,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new PasskeyError(
        error.error || "Failed to verify authentication",
        "VERIFICATION_ERROR",
        error
      );
    }

    // Session created successfully
    return { success: true };
  } catch (error) {
    if (error instanceof PasskeyError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred during passkey authentication",
    };
  }
}

/**
 * Check if passkeys are supported in the current browser
 */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function"
  );
}

/**
 * Check if platform authenticator (biometric/device) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Get user-friendly error messages
 */
export function getPasskeyErrorMessage(error: string | undefined): string {
  if (!error) return "An unknown error occurred";

  const errorMap: Record<string, string> = {
    USER_CANCELLED: "You cancelled the passkey operation",
    BROWSER_ERROR: "Your browser or device doesn't support passkeys",
    OPTIONS_ERROR: "Failed to start passkey operation",
    VERIFICATION_ERROR: "Failed to verify passkey",
    NO_CREDENTIALS: "No passkeys found for this account",
  };

  return errorMap[error] || error;
}

/**
 * Fetch all passkeys for the current user
 */
export async function listPasskeys(): Promise<{
  success: boolean;
  passkeys?: PasskeyCredentialSummary[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/auth/passkey/list", {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PasskeyError(
        error.error || "Failed to fetch passkeys",
        "FETCH_ERROR",
        error
      );
    }

    const data = await response.json();
    return { success: true, passkeys: data.passkeys };
  } catch (error) {
    if (error instanceof PasskeyError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred while fetching passkeys",
    };
  }
}

/**
 * Rename a passkey
 */
export async function renamePasskey(
  passkeyId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/auth/passkey/${passkeyId}/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PasskeyError(
        error.error || "Failed to rename passkey",
        "RENAME_ERROR",
        error
      );
    }

    return { success: true };
  } catch (error) {
    if (error instanceof PasskeyError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred while renaming passkey",
    };
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  passkeyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/auth/passkey/${passkeyId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PasskeyError(
        error.error || "Failed to delete passkey",
        "DELETE_ERROR",
        error
      );
    }

    return { success: true };
  } catch (error) {
    if (error instanceof PasskeyError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred while deleting passkey",
    };
  }
}
