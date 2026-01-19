/**
 * WebAuthn Server Utilities
 *
 * Server-side functions for WebAuthn registration and authentication.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts,
  type VerifiedRegistrationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRPConfig,
  CHALLENGE_TIMEOUT_MINUTES,
  USER_VERIFICATION,
  ATTESTATION_PREFERENCE,
  AUTHENTICATOR_ATTACHMENT,
  RESIDENT_KEY,
  SUPPORTED_ALGORITHM_IDS,
  WEBAUTHN_TIMEOUT,
} from "./config";
import type {
  WebAuthnCredential,
  WebAuthnCredentialInsert,
  WebAuthnChallengeInsert,
  AuthenticatorTransport,
} from "@/types/webauthn";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

/**
 * Generate registration options for a user
 */
export async function generateUserRegistrationOptions(userId: string, userEmail: string) {
  const supabase = await createClient();
  const rpConfig = getRPConfig();

  // Get user's WebAuthn user ID (create if doesn't exist)
  const { data: user } = await supabase
    .from("users")
    .select("webauthn_user_id")
    .eq("id", userId)
    .single();

  let webauthnUserId = user?.webauthn_user_id;

  if (!webauthnUserId) {
    // Generate a new WebAuthn user ID (random base64url string)
    webauthnUserId = isoBase64URL.fromBuffer(crypto.getRandomValues(new Uint8Array(32)));

    await supabase
      .from("users")
      .update({ webauthn_user_id: webauthnUserId })
      .eq("id", userId);
  }

  // Get user's existing credentials to exclude
  const { data: existingCredentials } = await supabase
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", userId);

  const excludeCredentials = (existingCredentials || []).map((cred) => ({
    id: cred.credential_id,
    type: "public-key" as const,
  }));

  // Generate registration options
  const opts: GenerateRegistrationOptionsOpts = {
    rpName: rpConfig.name,
    rpID: rpConfig.id,
    userID: isoBase64URL.toBuffer(webauthnUserId),
    userName: userEmail,
    userDisplayName: userEmail,
    timeout: WEBAUTHN_TIMEOUT,
    attestationType: ATTESTATION_PREFERENCE,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: RESIDENT_KEY,
      userVerification: USER_VERIFICATION,
      authenticatorAttachment: AUTHENTICATOR_ATTACHMENT,
    },
    supportedAlgorithmIDs: SUPPORTED_ALGORITHM_IDS,
  };

  const options = await generateRegistrationOptions(opts);

  // Store challenge in database
  const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT_MINUTES * 60 * 1000);

  const challengeInsert: WebAuthnChallengeInsert = {
    user_id: userId,
    challenge: options.challenge,
    type: "registration",
    expires_at: expiresAt.toISOString(),
  };

  await supabase.from("webauthn_challenges").insert(challengeInsert);

  return options;
}

/**
 * Verify registration response and store credential
 */
export async function verifyUserRegistrationResponse(
  userId: string,
  response: RegistrationResponseJSON,
  credentialName?: string
): Promise<VerifiedRegistrationResponse> {
  const supabase = await createClient();
  const rpConfig = getRPConfig();

  // Get and delete the challenge
  const { data: challengeData, error: challengeError } = await supabase
    .from("webauthn_challenges")
    .select("challenge")
    .eq("user_id", userId)
    .eq("type", "registration")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (challengeError || !challengeData) {
    throw new Error("Challenge not found or expired");
  }

  const expectedChallenge = challengeData.challenge;

  // Delete the challenge (single-use)
  await supabase
    .from("webauthn_challenges")
    .delete()
    .eq("user_id", userId)
    .eq("challenge", expectedChallenge);

  // Verify the registration response
  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: rpConfig.origin,
    expectedRPID: rpConfig.id,
    requireUserVerification: USER_VERIFICATION === "required",
  };

  const verification = await verifyRegistrationResponse(opts);

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { registrationInfo } = verification;
  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
    aaguid,
  } = registrationInfo;

  // Store the credential
  const credentialInsert: WebAuthnCredentialInsert = {
    user_id: userId,
    credential_id: credential.id, // Already base64url encoded string
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: (response.response?.transports || []) as AuthenticatorTransport[],
    aaguid,
    credential_name: credentialName || null,
  };

  const { error: insertError } = await supabase
    .from("webauthn_credentials")
    .insert(credentialInsert);

  if (insertError) {
    throw new Error(`Failed to store credential: ${insertError.message}`);
  }

  return verification;
}

/**
 * Generate authentication options for a user
 * Uses secure database functions that bypass RLS safely
 */
export async function generateUserAuthenticationOptions(userEmail: string) {
  const supabase = await createClient();
  const rpConfig = getRPConfig();

  // Get user's credentials using secure database function
  const { data: credentials, error: credError } = await supabase
    .rpc("get_user_credentials_for_auth", { user_email: userEmail });

  if (credError) {
    if (credError.message.includes("User not found")) {
      throw new Error("User not found");
    }
    throw new Error("Failed to get credentials");
  }

  if (!credentials || credentials.length === 0) {
    throw new Error("No passkeys registered for this user");
  }

  const allowCredentials = credentials.map((cred: { credential_id: string; transports: string[] }) => ({
    id: cred.credential_id,
    type: "public-key" as const,
    transports: cred.transports as AuthenticatorTransport[] | undefined,
  }));

  // Generate authentication options
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID: rpConfig.id,
    timeout: WEBAUTHN_TIMEOUT,
    allowCredentials,
    userVerification: USER_VERIFICATION,
  };

  const options = await generateAuthenticationOptions(opts);

  // Store challenge using secure database function
  const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT_MINUTES * 60 * 1000);

  const { error: challengeError } = await supabase
    .rpc("store_auth_challenge", {
      p_user_email: userEmail,
      p_challenge: options.challenge,
      p_expires_at: expiresAt.toISOString(),
    });

  if (challengeError) {
    throw new Error("Failed to store challenge");
  }

  return { options, userId: credentials[0].user_id };
}

/**
 * Verify authentication response
 * Uses secure database functions that bypass RLS safely
 */
export async function verifyUserAuthenticationResponse(
  userEmail: string,
  response: AuthenticationResponseJSON
): Promise<{ verified: boolean; userId: string }> {
  const supabase = await createClient();
  const rpConfig = getRPConfig();

  // Get and consume the challenge using secure database function
  const { data: challengeData, error: challengeError } = await supabase
    .rpc("get_and_consume_auth_challenge", { p_user_email: userEmail });

  if (challengeError) {
    if (challengeError.message.includes("User not found")) {
      throw new Error("User not found");
    }
    if (challengeError.message.includes("Challenge not found")) {
      throw new Error("Challenge not found or expired");
    }
    throw new Error("Failed to get challenge");
  }

  const expectedChallenge = challengeData;

  // Get the credential using secure database function
  const credentialID = response.id;
  const { data: credentials, error: credError } = await supabase
    .rpc("get_credential_for_verification", {
      user_email: userEmail,
      cred_id: credentialID,
    });

  if (credError || !credentials || credentials.length === 0) {
    throw new Error("Credential not found");
  }

  const credential = credentials[0];

  // Verify the authentication response
  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: rpConfig.origin,
    expectedRPID: rpConfig.id,
    credential: {
      id: credential.credential_id,
      publicKey: isoBase64URL.toBuffer(credential.public_key),
      counter: credential.counter,
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    },
    requireUserVerification: USER_VERIFICATION === "required",
  };

  const verification = await verifyAuthenticationResponse(opts);

  if (!verification.verified) {
    throw new Error("Authentication verification failed");
  }

  // Update counter using secure database function
  await supabase
    .rpc("update_credential_counter", {
      cred_id: credentialID,
      new_counter: verification.authenticationInfo.newCounter,
    });

  return { verified: true, userId: credential.user_id };
}

/**
 * Clean up expired challenges (should be run periodically)
 */
export async function cleanupExpiredChallenges() {
  const supabase = await createClient();

  await supabase
    .from("webauthn_challenges")
    .delete()
    .lt("expires_at", new Date().toISOString());
}
