/**
 * WebAuthn / Passkey Configuration
 *
 * Centralizes all WebAuthn configuration including Relying Party (RP) settings.
 */

import type { RPConfig } from "@/types/webauthn";

/**
 * Get Relying Party configuration from environment variables
 */
export function getRPConfig(): RPConfig {
  const rpName = process.env.NEXT_PUBLIC_RP_NAME;
  const rpID = process.env.NEXT_PUBLIC_RP_ID;
  const rpOrigin = process.env.NEXT_PUBLIC_RP_ORIGIN;

  if (!rpName || !rpID || !rpOrigin) {
    throw new Error(
      "Missing required WebAuthn environment variables. Please set NEXT_PUBLIC_RP_NAME, NEXT_PUBLIC_RP_ID, and NEXT_PUBLIC_RP_ORIGIN."
    );
  }

  return {
    name: rpName,
    id: rpID,
    origin: rpOrigin,
  };
}

/**
 * Challenge timeout in milliseconds (5 minutes)
 */
export const CHALLENGE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Challenge timeout for database calculations
 */
export const CHALLENGE_TIMEOUT_MINUTES = 5;

/**
 * User verification requirement
 * - "required": Always require biometric/PIN
 * - "preferred": Prefer but don't require
 * - "discouraged": Don't ask for verification
 */
export const USER_VERIFICATION: "required" | "preferred" | "discouraged" = "preferred";

/**
 * Attestation conveyance preference
 * - "none": Don't request attestation (fastest, recommended)
 * - "indirect": Allow RP to request attestation
 * - "direct": Request attestation directly
 */
export const ATTESTATION_PREFERENCE = "none";

/**
 * Authenticator attachment
 * - "platform": Built-in authenticators (Touch ID, Windows Hello, etc.)
 * - "cross-platform": External authenticators (security keys)
 * - undefined: Allow both
 */
export const AUTHENTICATOR_ATTACHMENT = undefined; // Allow both types

/**
 * Resident key requirement
 * - "required": Credential must be stored on authenticator
 * - "preferred": Prefer but don't require
 * - "discouraged": Don't create resident key
 */
export const RESIDENT_KEY = "preferred";

/**
 * Supported public key algorithms in order of preference
 * ES256 (-7) and RS256 (-257) are most widely supported
 */
export const SUPPORTED_ALGORITHM_IDS = [-7, -257];

/**
 * Timeout for credential creation/retrieval (in milliseconds)
 */
export const WEBAUTHN_TIMEOUT = 60000; // 60 seconds
